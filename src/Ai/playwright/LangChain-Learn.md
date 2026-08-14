---
title: "告别重复劳动：Playwright CLI + Skills 实战案例大全"
sidebarGroup: "自动化 / Playwright"
shortTitle: "Function Calling 入门"
order: 4
date: 2026-04-26
category: "AI"
tag:
  - "Playwright CLI"
  - "Skills"
---



### 一个最简单的Function Calling

``` python
import json
from openai import OpenAI

# 第一步 初始化客户端，这里我使用的是本地搭建的ollama，也可以使用第三方API
client = OpenAI(
    base_url="http://192.168.13.23:8842/v1",
    api_key="ollama"
)

# 第二步 定义工具函数 
def get_weather(location: str):
    """模拟天气查询函数，实际项目中替换为真实API（如和风天气）"""
    print(f"【调试】正在查询 {location} 的天气...")
    weather_data = {
        "location": location,
        "temperature": "22°C",
        "condition": "晴天",
        "wind": "3级"
    }
    return json.dumps(weather_data)

# 第三步 定义工具描述（Schema）
# 函数名，功能描述
# 参数名，类型，描述
# 哪些参数是必须的
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "城市名称，如北京、上海"
                    }
                },
                "required": ["location"]
            }
        }
    }
]


user_input = '今天，北京的天气怎么样？'

# 第一次调用：让 AI 决定是否调用工具，AI根据传入的问题和能够调用的工具，自主去判断是否去调用工具
resp = client.chat.completions.create(
    model='Qwen3.5-27B-Q8_0.gguf',
    messages=[{'role': 'user', 'content': user_input}],
    tools=tools,
    tool_choice='auto'
)

print(resp)


# =======================================================
# 解析并执行工具调用
# 
# 在返回结果中，能能够看到当前返回调用情况，当前大模型决定使用哪个方法，方法名称，方法参数
# =======================================================
tool_calls = resp.choices[0].message.tool_calls
if tool_calls:
    function_name = tool_calls[0].function.name
    function_args = json.loads(tool_calls[0].function.arguments)
    location = function_args["location"]

    if function_name == 'get_weather':
        result = get_weather(location)

        
    # =======================================================
    # 第二次调用：将工具结果返回给模型
    # 
    # 必须按照顺序包含这三条消息，让模型理解
    # 1、用户问了什么
    # 2、模型刚才想调用什么工具
    # 3、工具返回了什么结果
    # =======================================================
    second_response = client.chat.completions.create(
        model="Qwen3.5-27B-Q8_0.gguf",
        messages=[
            {"role": "user", "content": user_input}, # 原始问题
            {"role": "assistant", "content": "", "tool_calls": tool_calls}, # AI 请求调用工具 
            {"role": "tool", "content": result, "tool_call_id": tool_calls[0].id}  # 工具执行结果
        ],
    )

    #  输出最终回答
    final_answer = second_response.choices[0].message.content
    print(f"AI回答：{final_answer}")

```

