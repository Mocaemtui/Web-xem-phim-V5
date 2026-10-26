import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, targetLang = "vi" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Google Translate Free Endpoint (GTX)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Translate API Error: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Google returns a nested array: [[[ "Translated text", "Original text", ... ]]]
    let translatedText = "";
    if (data && data[0] && Array.isArray(data[0])) {
      data[0].forEach((item: any) => {
        if (item[0]) translatedText += item[0];
      });
    }

    return NextResponse.json({ translatedText: translatedText || text });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: "Failed to translate" }, { status: 500 });
  }
}
