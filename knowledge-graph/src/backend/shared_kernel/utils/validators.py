import os
import re
import time
from typing import Optional, Tuple, Dict, Any

try:
    # email-validator 库用于邮箱格式校验与标准化
    from email_validator import validate_email as ev_validate, EmailNotValidError
except Exception:
    ev_validate = None
    EmailNotValidError = Exception


# 轻量 MX/DNS 结果缓存（生产环境下减少重复解析）
_MX_CACHE: Dict[str, Tuple[float, bool, Optional[str]]] = {}
_MX_CACHE_TTL_SECONDS = int(os.getenv("EMAIL_MX_CACHE_TTL_SECONDS", "300"))  # 5 分钟默认
_MX_CACHE_MAXSIZE = int(os.getenv("EMAIL_MX_CACHE_MAXSIZE", "512"))


def _default_check_deliverability() -> bool:
    """根据环境决定是否启用邮箱可达性（MX/DNS）检查。
    优先读取 EMAIL_CHECK_DELIVERABILITY；未设置时，production 启用，其它环境关闭。
    """
    env_val = os.getenv("EMAIL_CHECK_DELIVERABILITY")
    if env_val is not None:
        return env_val.strip().lower() in {"1", "true", "yes", "on"}

    # 根据常见环境变量判断
    flask_env = (os.getenv("FLASK_ENV") or "").lower()
    app_env = (os.getenv("APP_ENV") or os.getenv("ENV") or "").lower()
    if flask_env == "production" or app_env == "production":
        return True
    return False


def _evict_cache_if_needed():
    if len(_MX_CACHE) <= _MX_CACHE_MAXSIZE:
        return
    # 简单淘汰策略：移除最早过期的一个
    victim = None
    for domain, (expire_at, _res, _reason) in _MX_CACHE.items():
        if victim is None or expire_at < victim[1]:
            victim = (domain, expire_at)
    if victim:
        _MX_CACHE.pop(victim[0], None)


def _mx_cache_get(domain: str) -> Optional[Tuple[bool, Optional[str]]]:
    now = time.time()
    item = _MX_CACHE.get(domain)
    if not item:
        return None
    expire_at, res, reason = item
    if expire_at > now:
        return res, reason
    # 过期删除
    _MX_CACHE.pop(domain, None)
    return None


def _mx_cache_put(domain: str, res: bool, reason: Optional[str]) -> None:
    _evict_cache_if_needed()
    _MX_CACHE[domain] = (time.time() + _MX_CACHE_TTL_SECONDS, res, reason)


def _check_domain_deliverability(domain: str) -> Tuple[bool, Optional[str]]:
    """检查域名是否可达（存在 MX 记录，或至少存在 A/AAAA）。返回 (可达, 详细原因代码)。
    详细原因代码：
    - "domain_not_found": 域名不存在（NXDOMAIN）
    - "dns_unreachable": DNS 不可达或解析异常
    - "mx_or_a_not_found": 无 MX 且无 A/AAAA 记录
    - None: 可达
    """
    cached = _mx_cache_get(domain)
    if cached is not None:
        return cached

    try:
        import dns.resolver  # dnspython
        resolver = dns.resolver.Resolver()
        timeout = float(os.getenv("EMAIL_DNS_TIMEOUT", "3"))
        resolver.timeout = timeout
        resolver.lifetime = timeout

        # 尝试解析 MX
        try:
            answers = resolver.resolve(domain, "MX", raise_on_no_answer=False)
            if answers and answers.rrset and len(answers.rrset) > 0:
                _mx_cache_put(domain, True, None)
                return True, None
        except dns.resolver.NXDOMAIN:
            _mx_cache_put(domain, False, "domain_not_found")
            return False, "domain_not_found"
        except dns.resolver.NoNameservers:
            _mx_cache_put(domain, False, "dns_unreachable")
            return False, "dns_unreachable"
        except Exception:
            # 继续尝试 A/AAAA
            pass

        # 回退：检查 A 或 AAAA
        try:
            a = resolver.resolve(domain, "A", raise_on_no_answer=False)
            if a and a.rrset and len(a.rrset) > 0:
                _mx_cache_put(domain, True, None)
                return True, None
        except Exception:
            try:
                aaaa = resolver.resolve(domain, "AAAA", raise_on_no_answer=False)
                if aaaa and aaaa.rrset and len(aaaa.rrset) > 0:
                    _mx_cache_put(domain, True, None)
                    return True, None
            except Exception:
                _mx_cache_put(domain, False, "mx_or_a_not_found")
                return False, "mx_or_a_not_found"

    except Exception:
        _mx_cache_put(domain, False, "dns_unreachable")
        return False, "dns_unreachable"


def _map_email_error_message(msg: str, lang: str = "zh-CN") -> Tuple[str, str, str]:
    """将 email-validator 的错误消息映射为统一文案与编码。
    返回 (message, code, reason_category)。reason_category 为 "format_error" 或 "deliverability_error"。
    可根据需要扩展匹配表。
    """
    text = (msg or "").lower()

    # 细粒度匹配表（可扩展）
    patterns = [
        ("must have exactly one @", "invalid_email_format"),
        ("an invalid character was found", "invalid_email_format"),
        ("the domain name", "invalid_domain"),
        ("is not a valid domain", "invalid_domain"),
        ("there are consecutive dots", "invalid_email_format"),
        ("the part after the @-sign", "invalid_domain"),
        ("the local part", "invalid_local_part"),
        ("ascii", "invalid_email_format"),
    ]

    code = "invalid_email_format"
    for key, val in patterns:
        if key in text:
            code = val
            break

    if lang == "en-US":
        messages = {
            "invalid_email_format": "Invalid email format.",
            "invalid_domain": "Invalid email domain.",
            "invalid_local_part": "Invalid local part before @.",
        }
    else:
        messages = {
            "invalid_email_format": "邮箱格式不正确",
            "invalid_domain": "邮箱域名不合法",
            "invalid_local_part": "邮箱本地部分不合法",
        }

    return messages.get(code, messages["invalid_email_format"]), code, "format_error"


def _map_deliverability_reason(reason_code: Optional[str], lang: str = "zh-CN") -> Tuple[str, str, str]:
    """将可达性检查原因映射为消息、编码与原因分类。返回 (message, code, reason_category)。"""
    if lang == "en-US":
        messages = {
            "domain_not_found": "Email domain not found (NXDOMAIN).",
            "dns_unreachable": "DNS unreachable or timeout.",
            "mx_or_a_not_found": "No MX or A/AAAA records found.",
        }
    else:
        messages = {
            "domain_not_found": "邮箱域名不存在（DNS NXDOMAIN）",
            "dns_unreachable": "DNS 不可达或查询超时",
            "mx_or_a_not_found": "域名缺少 MX 或 A/AAAA 记录（不可投递）",
        }

    code = reason_code or "mx_or_a_not_found"
    msg = messages.get(code, messages["mx_or_a_not_found"])
    return msg, code, "deliverability_error"


def validate_email_ex(email: Optional[str], allow_empty: bool = False,
                      check_deliverability: Optional[bool] = None,
                      lang: str = "zh-CN") -> Dict[str, Any]:
    """增强版邮箱校验：返回结构化结果，包含 code 与 reason。
    返回字典：{
      ok: bool,
      email: Optional[str],  # 标准化邮箱（IDN 处理）
      message: Optional[str],
      code: Optional[str],   # 错误编码，便于前端国际化映射
      reason: Optional[str], # 原因分类：format_error / deliverability_error / empty
    }
    """
    if email is None:
        return {
            "ok": allow_empty,
            "email": "" if allow_empty else None,
            "message": None if allow_empty else ("邮箱不能为空" if lang != "en-US" else "Email is required"),
            "code": None if allow_empty else "empty",
            "reason": None if allow_empty else "format_error",
        }

    raw = email.strip()
    if raw == "":
        return {
            "ok": True if allow_empty else False,
            "email": "" if allow_empty else None,
            "message": None if allow_empty else ("邮箱不能为空" if lang != "en-US" else "Email is required"),
            "code": None if allow_empty else "empty",
            "reason": None if allow_empty else "format_error",
        }

    # 仅做格式校验与标准化（避免重复 DNS 查询）
    try:
        if ev_validate is None:
            # 回退：简单正则校验
            pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
            if not re.match(pattern, raw):
                msg, code, reason = _map_email_error_message("invalid format", lang)
                return {"ok": False, "email": None, "message": msg, "code": code, "reason": reason}
            normalized_email = raw
        else:
            res = ev_validate(raw, allow_smtputf8=True, check_deliverability=False)
            normalized_email = res.email
    except EmailNotValidError as e:
        msg, code, reason = _map_email_error_message(str(e), lang)
        return {"ok": False, "email": None, "message": msg, "code": code, "reason": reason}

    # 可达性（MX/DNS）检查（按环境默认策略）
    if check_deliverability is None:
        check_deliverability = _default_check_deliverability()
    if check_deliverability:
        domain = normalized_email.split("@")[-1].lower()
        deliverable, reason_code = _check_domain_deliverability(domain)
        if not deliverable:
            msg, code, reason = _map_deliverability_reason(reason_code, lang)
            return {"ok": False, "email": None, "message": msg, "code": code, "reason": reason}

    return {"ok": True, "email": normalized_email, "message": None, "code": None, "reason": None}


def validate_email(email: Optional[str], allow_empty: bool = False,
                   check_deliverability: Optional[bool] = None,
                   lang: str = "zh-CN") -> Tuple[bool, Optional[str], Optional[str]]:
    """兼容旧签名：仅返回 (ok, normalized_email, message)。"""
    res = validate_email_ex(email, allow_empty=allow_empty, check_deliverability=check_deliverability, lang=lang)
    return res["ok"], res["email"], res["message"]


def validate_phone_ex(phone: Optional[str], allow_empty: bool = False, lang: str = "zh-CN") -> Dict[str, Any]:
    """增强版手机号校验：返回结构化结果，包含 code 与 reason。
    返回字典：{
      ok: bool,
      phone: Optional[str],
      message: Optional[str],
      code: Optional[str],   # 错误编码
      reason: Optional[str], # 原因分类：format_error / empty
    }
    """
    if phone is None:
        return {
            "ok": allow_empty,
            "phone": "" if allow_empty else None,
            "message": None if allow_empty else ("手机号不能为空" if lang != "en-US" else "Phone is required"),
            "code": None if allow_empty else "empty",
            "reason": None if allow_empty else "format_error",
        }

    raw = phone.strip()
    if raw == "":
        return {
            "ok": True if allow_empty else False,
            "phone": "" if allow_empty else None,
            "message": None if allow_empty else ("手机号不能为空" if lang != "en-US" else "Phone is required"),
            "code": None if allow_empty else "empty",
            "reason": None if allow_empty else "format_error",
        }

    pattern = r"^\+?[0-9]{7,15}$"
    if not re.match(pattern, raw):
        msg_zh = "手机号格式不合法，应为国际格式（示例：+8613800138000）"
        msg_en = "Invalid phone format, expected E.164 (e.g., +8613800138000)."
        return {"ok": False, "phone": None, "message": msg_zh if lang != "en-US" else msg_en, "code": "invalid_phone_format", "reason": "format_error"}

    # 标准化：移除空格，确保 + 仅一个
    normalized = raw.replace(" ", "")
    return {"ok": True, "phone": normalized, "message": None, "code": None, "reason": None}


def validate_phone(phone: Optional[str], allow_empty: bool = False) -> Tuple[bool, Optional[str], Optional[str]]:
    """兼容旧签名：仅返回 (ok, normalized_phone, message)。"""
    res = validate_phone_ex(phone, allow_empty=allow_empty)
    return res["ok"], res.get("phone"), res.get("message")