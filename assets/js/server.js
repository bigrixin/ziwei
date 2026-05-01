const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// 豆包 API 配置
const client = new OpenAI({
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: '5b02efdd-4080-4b4f-99c7-6287a19d5c99',
});

// 紫薇斗数 AI 解盘接口
app.post('/api/ziwei-ai', async (req, res) => {
  try {
    const { year, month, day, hour, gender, palaces, stars, fudeStars, threePalaceStars, patterns } = req.body;

    // 专业命理 Prompt（直接用，非常准）
    const prompt = `
你是专业紫微斗数命理师，只根据以下命盘信息解答，不编造、不迷信、不恐吓。

【命盘资料】
出生时间：${year}年${month}月${day}日 ${hour}时
性别：${gender}
十二宫：${JSON.stringify(palaces)}
命宫星耀：${JSON.stringify(stars)}
福德宫星耀：${JSON.stringify(fudeStars || [])}
三方四正星耀：${JSON.stringify(threePalaceStars || [])}
格局：${JSON.stringify(patterns)}

请用通俗易懂、条理清晰的方式，从以下 4 点分析：
1. 性格特质
2. 事业财运
3. 感情婚姻
4. 健康注意

语言温和、正式、有帮助。
`;

    // 流式返回（打字机效果）
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const stream = await client.chat.completions.create({
      model: 'doubao-seed-2-0-pro-260215',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      res.write(content);
    }
    res.end();

  } catch (err) {
    res.send('AI 解盘暂时出错');
  }
});

const PORT = 3868;
app.listen(PORT, () => {
  console.log(`服务已启动：http://localhost:${PORT}`);
});