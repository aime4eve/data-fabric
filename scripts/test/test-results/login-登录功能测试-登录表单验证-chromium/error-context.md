# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e7]:
    - heading "企业知识库" [level=2] [ref=e8]
    - generic [ref=e9]: 登录您的账户以访问知识库系统
  - generic [ref=e10]:
    - generic [ref=e12]:
      - generic "用户名或邮箱" [ref=e14]: "* 用户名或邮箱"
      - generic [ref=e15]:
        - generic [ref=e18]:
          - img "user" [ref=e20]:
            - img [ref=e21]
          - textbox "请输入用户名或邮箱" [ref=e23]
        - generic [ref=e26]: 请输入用户名或邮箱
    - generic [ref=e28]:
      - generic "密码" [ref=e30]: "* 密码"
      - generic [ref=e34]:
        - img "lock" [ref=e36]:
          - img [ref=e37]
        - textbox "请输入密码" [ref=e39]: somepassword
        - img "eye-invisible" [ref=e41] [cursor=pointer]:
          - img [ref=e42] [cursor=pointer]
    - button "登 录" [active] [ref=e50] [cursor=pointer]:
      - generic [ref=e51] [cursor=pointer]: 登 录
  - generic [ref=e53]:
    - text: 还没有账户？
    - link "立即注册" [ref=e54] [cursor=pointer]:
      - /url: /register
```