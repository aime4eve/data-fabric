# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e7]:
    - heading "企业知识库" [level=2] [ref=e8]
    - generic [ref=e9]: 登录您的账户以访问知识库系统
  - alert [ref=e10]:
    - img "close-circle" [ref=e11]:
      - img [ref=e12]
    - generic [ref=e15]: 用户名或密码错误
    - button "close" [ref=e16] [cursor=pointer]:
      - img "close" [ref=e17] [cursor=pointer]:
        - img [ref=e18] [cursor=pointer]
  - generic [ref=e20]:
    - generic [ref=e22]:
      - generic "用户名或邮箱" [ref=e24]: "* 用户名或邮箱"
      - generic [ref=e28]:
        - img "user" [ref=e30]:
          - img [ref=e31]
        - textbox "请输入用户名或邮箱" [ref=e33]: testuser
    - generic [ref=e35]:
      - generic "密码" [ref=e37]: "* 密码"
      - generic [ref=e41]:
        - img "lock" [ref=e43]:
          - img [ref=e44]
        - textbox "请输入密码" [ref=e46]: testpass123
        - img "eye-invisible" [ref=e48] [cursor=pointer]:
          - img [ref=e49] [cursor=pointer]
    - button "loading 登 录" [active] [ref=e57] [cursor=pointer]:
      - generic:
        - img "loading"
      - generic [ref=e58] [cursor=pointer]: 登 录
  - generic [ref=e60]:
    - text: 还没有账户？
    - link "立即注册" [ref=e61] [cursor=pointer]:
      - /url: /register
```