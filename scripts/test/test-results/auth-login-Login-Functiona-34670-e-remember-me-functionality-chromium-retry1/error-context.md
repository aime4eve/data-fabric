# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e7]:
    - heading "企业知识库" [level=2] [ref=e8]
    - generic [ref=e9]: 登录您的账户以访问知识库系统
  - generic [ref=e10]:
    - generic [ref=e12]:
      - generic "用户名或邮箱" [ref=e14]: "* 用户名或邮箱"
      - generic [ref=e18]:
        - img "user" [ref=e20]:
          - img [ref=e21]
        - textbox "请输入用户名或邮箱" [ref=e23]: testuser
    - generic [ref=e25]:
      - generic "密码" [ref=e27]: "* 密码"
      - generic [ref=e31]:
        - img "lock" [ref=e33]:
          - img [ref=e34]
        - textbox "请输入密码" [active] [ref=e36]: password123
        - img "eye-invisible" [ref=e38] [cursor=pointer]:
          - img [ref=e39] [cursor=pointer]
    - button "登 录" [ref=e47] [cursor=pointer]:
      - generic [ref=e48] [cursor=pointer]: 登 录
  - generic [ref=e50]:
    - text: 还没有账户？
    - link "立即注册" [ref=e51] [cursor=pointer]:
      - /url: /register
```