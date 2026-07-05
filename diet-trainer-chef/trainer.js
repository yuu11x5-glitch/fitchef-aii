// trainer.js
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Helper to retrieve API key
function getApiKey() {
  return localStorage.getItem('fitchef_api_key') || '';
}

// Validate API key with a simple request
async function validateApiKey(key) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'API validation check. Respond with "ok".' }] }]
      })
    });
    return response.ok;
  } catch (e) {
    console.error("API validation error:", e);
    return false;
  }
}

// 1. Analyze Food Image using Gemini Vision API
async function analyzeImageAI(base64Data, mimeType) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.log("No API key. Running in Demo Mode.");
    // Simulate delay for realism
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      foodName: "手作りハンバーグ定食 (デモ)",
      calories: 780,
      p: 28,
      f: 32,
      c: 85,
      trainerAdvice: "デモモードでの解析です。タンパク質は28g確保できており素晴らしいですが、ハンバーグの脂質(32g)がやや多めです。次回は付け合わせの野菜から食べることで糖質の吸収を緩やかにし、余力があれば食後に15分ほどの軽いウォーキングをしましょう！",
      chefAdvice: "デモモードでの解析です。ご自宅でハンバーグを作る際は、ひき肉の3割ほどを豆腐や細かく刻んだエリンギに置き換えることで、美味しさを保ちつつカロリーと脂質をカットできます。デミグラスソースの代わりに和風ポン酢にするとさらに健康的です！"
    };
  }

  // Clean base64 string (remove data:image/png;base64, prefix)
  const base64Content = base64Data.split(',')[1] || base64Data;

  const prompt = `
    添付された食事の写真を分析してください。
    以下の情報を推定し、必ず指定されたJSONフォーマットのみで出力してください。他の説明や文章は一切含めないでください。

    【JSON構造】
    {
      "foodName": "推定される料理名・主食とおかずなど",
      "calories": 780, (総カロリー数値。単位は不要)
      "p": 30, (推定タンパク質数値。単位は不要。g換算)
      "f": 25, (推定脂質数値。単位は不要。g換算)
      "c": 90, (推定炭水化物数値。単位は不要。g換算)
      "trainerAdvice": "熱血パーソナルトレーナーのレオ（敬語は使わず、親しみやすくポジティブでモチベーションを上げる熱い口調、運動のアドバイスや健康的な食べ方の指導）からの個別アドバイス",
      "chefAdvice": "優しい専属シェフのレイ（物腰が柔らかく丁寧な口調、自炊で作る際のおすすめの代替食材や健康レシピのコツ、美味しくする工夫）からの個別アドバイス"
    }
  `;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Content
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errText}`);
    }

    const resJson = await response.json();
    const responseText = resJson.candidates[0].content.parts[0].text;
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Image Analysis failed:", error);
    alert("AI画像解析に失敗しました。一時的にデモデータを表示します。原因: " + error.message);
    // Fallback to mock
    return {
      foodName: "解析エラー (デモ切り替え)",
      calories: 600,
      p: 20,
      f: 15,
      c: 80,
      trainerAdvice: "API接続エラーが発生したみたいだ！でも諦めるな、今日できる運動（スクワットなど）をしっかりこなそう！",
      chefAdvice: "API接続に問題が生じたようです。こういう時は、野菜スープなど簡単なもので栄養を補給し、ゆっくり体を休めてくださいね。"
    };
  }
}

// 2. Generate Recipe using Gemini API
async function generateRecipeAI(ingredients, timeLimit, dietType, profile) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log("No API key. Running Recipe Demo.");
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      title: "【デモ】しっとり鶏胸肉と豆腐のねぎ塩焼き",
      time: "15分",
      calories: 290,
      p: 42,
      f: 7,
      c: 11,
      ingredients: "・鶏胸肉: 150g\n・木綿豆腐: 100g\n・長ネギ: 1/2本\n・ごま油: 小さじ1\n・塩コショウ: 少々\n・鶏ガラスープの素: 小さじ1/2",
      steps: [
        "鶏胸肉を一口大のそぎ切りにし、塩コショウと酒少々（分量外）を揉み込みます。",
        "豆腐はキッチンペーパーに包んで軽く水切りし、一口大に切ります。",
        "フライパンにごま油を熱し、鶏胸肉と豆腐を両面がキツネ色になるまで焼きます。",
        "みじん切りにした長ネギと鶏ガラスープの素を加え、全体にサッと絡めて完成です。"
      ],
      chefTip: "デモ用のレシピです。鶏胸肉は繊維を断ち切るようにそぎ切りにすること、そして片栗粉を薄くまぶしてから焼くと、驚くほどしっとりジューシーに仕上がりますよ！"
    };
  }

  const prompt = `
    あなたはパーソナルダイエットシェフ「レイ」です。
    ユーザーの要望に応じて、ダイエットに最適で美味しい自炊レシピを考案してください。

    【ユーザー情報】
    - 年齢: ${profile.age}歳, 性別/目標: ${profile.goalType}
    - 利用可能な食材: ${ingredients || "指定なし（一般的な食材を使用）"}
    - 希望調理時間: ${timeLimit}
    - レシピの重視事項: ${dietType}

    以下のJSONフォーマットのみで出力してください。他の説明や文章は一切含めないでください。

    【JSON構造】
    {
      "title": "考案した料理の名前",
      "time": "目安の調理時間（例：15分）",
      "calories": 320, (エネルギーkcalの数値のみ。単位不要)
      "p": 35, (タンパク質gの数値のみ。単位不要)
      "f": 8, (脂質gの数値のみ。単位不要)
      "c": 15, (炭水化物gの数値のみ。単位不要)
      "ingredients": "必要な材料と分量を改行区切りの箇条書きテキストで記載してください",
      "steps": [
        "ステップ1の説明文",
        "ステップ2の説明文",
        "ステップ3の説明文"
      ],
      "chefTip": "シェフからの美味しく仕上げるコツや、栄養面でのアドバイスを1〜2文で"
    }
  `;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const resJson = await response.json();
    const responseText = resJson.candidates[0].content.parts[0].text;
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Recipe Generation failed:", error);
    alert("レシピの生成に失敗しました。");
    return null;
  }
}

// 3. AI Chat Logic with History
async function chatWithCoachesAI(chatHistory, userMessage, profile, advisorType) {
  const apiKey = getApiKey();

  if (!apiKey) {
    await new Promise(resolve => setTimeout(resolve, 800));
    // Pre-coded simple mock responses
    const upperMsg = userMessage.toLowerCase();
    if (upperMsg.includes("プロテイン") || upperMsg.includes("たんぱく")) {
      return "🏋️ **レオ:** プロテインはトレーニング後45分以内に飲むのがゴールデンタイムだ！筋肉の修復に最高だぞ！\n\n🍳 **レイ:** 自炊でタンパク質を補うなら、鶏胸肉以外にもタラや鮭などの魚類、イカやタコも低脂質高タンパクでおすすめです。";
    } else if (upperMsg.includes("痩") || upperMsg.includes("ダイエット")) {
      return "🏋️ **レオ:** ダイエットの基本は消費カロリー ＞ 摂取カロリーだ！でも極端な食事制限は代謝を下げるから、筋トレして筋肉を維持しながら健康的に落とそう！\n\n🍳 **レイ:** カロリーを抑えつつ満腹感を得るには、キノコ類や海藻類を使ったスープや、豆腐を活用したボリュームアップおかずが効果的ですよ。";
    } else {
      return "🏋️ **レオ:** よし、その調子だ！日々の小さな積み重ねが、大きな体の変化に繋がるぞ。何か運動やメニューで悩んだらいつでも聞いてくれ！\n\n🍳 **レイ:** 日々の食事管理、お疲れ様です。無理をして美味しいものを我慢するのではなく、ヘルシーにアレンジして楽しく自炊を続けましょうね。";
    }
  }

  // Construct prompt based on advisor selection
  let systemPrompt = "";
  if (advisorType === "trainer") {
    systemPrompt = `
      あなたは熱血パーソナルトレーナー「レオ」です。
      【レオの設定】
      - 敬語は使わず、親しみやすく熱い口調（〜だ！、〜ぞ！、〜しよう！）。
      - ポジティブでモチベーションを上げる応援が得意。
      - 筋トレ、有酸素運動、ストレッチ、減量のペースなどのアドバイスを行う。
    `;
  } else if (advisorType === "chef") {
    systemPrompt = `
      あなたは優しい専属シェフ「レイ」です。
      【レイの設定】
      - 物腰が柔らかく、非常に丁寧な敬語を使う（〜です、〜ですね、〜してくださいね）。
      - 食材の代替案、調理の手間を省くコツ、美味しいダイエットメニューのヒントを出す。
      - 栄養バランス（PFC）を崩さずに美味しく食べるアプローチを提案する。
    `;
  } else {
    systemPrompt = `
      あなたは「熱血パーソナルトレーナーのレオ」と「優しい専属シェフのレイ」の二人です。
      ユーザーからの発言に対して、必ず二人とも個別に回答を作成し、一つのメッセージにまとめてください。
      
      【フォーマット】
      🏋️ **レオ:**
      (レオのアドバイス)

      🍳 **レイ:**
      (レイのアドバイス)

      【レオの設定】
      - 敬語は使わず、熱く、元気でポジティブ（〜だ！、〜ぞ！）。運動・減量担当。
      【レイの設定】
      - 丁寧で優しい敬語（〜ですね、〜ですよ）。自炊・レシピ担当。
    `;
  }

  const finalPrompt = `
    ${systemPrompt}

    【ユーザープロフィール】
    - 年齢: ${profile.age}歳
    - 身長: ${profile.height}cm
    - 体重: ${profile.weight}kg (目標: ${profile.weightTarget}kg)
    - ダイエット目標: ${profile.goalType}
    - 今日の摂取カロリー: ${profile.currentCalIn} kcal (目標: ${profile.calTarget} kcal)

    【会話履歴】
    ${chatHistory.map(h => `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.text}`).join('\n')}

    ユーザーからの最新メッセージ: "${userMessage}"
    
    上記の情報とキャラクター設定を踏まえて、ユーザーに対して適切なアドバイス・返答を返してください。
  `;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const resJson = await response.json();
    return resJson.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Chat failed:", error);
    return "🏋️ **レオ:** 悪い、ちょっと通信の調子がおかしいみたいだ！でも気持ちを切らさずにトレーニング頑張るぞ！\n\n🍳 **レイ:** 通信エラーが発生したようです。申し訳ありません。また時間をおいて話しかけてくださいね。";
  }
}
