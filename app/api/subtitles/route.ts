import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imdbId = searchParams.get("imdbId");
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");
  const serve = searchParams.get("serve");

  if (!imdbId) {
    return NextResponse.json({ error: "Missing imdbId" }, { status: 400 });
  }

  const apiKey = process.env.SUBDL_API_KEY;
  if (!apiKey) {
    if (serve === "vtt") {
      return new NextResponse("WEBVTT\n\nNOTE No API Key configured", { headers: { "Content-Type": "text/vtt" } });
    }
    return NextResponse.json({ error: "SubDL API Key not configured" }, { status: 500 });
  }

  try {
    // 1. Fetch subtitle info from SubDL
    let apiUrl = `https://api.subdl.com/api/v1/subtitles?api_key=${apiKey}&imdb_id=${imdbId}&languages=VI`;
    if (season && episode) {
      apiUrl += `&type=tv&season_number=${season}&episode_number=${episode}`;
    } else {
      apiUrl += `&type=movie`;
    }

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.status || !data.subtitles || data.subtitles.length === 0) {
      if (serve === "vtt") return new NextResponse("WEBVTT\n\n", { headers: { "Content-Type": "text/vtt" } });
      return NextResponse.json({ subtitles: [] });
    }

    // Lấy link tải ZIP của file phụ đề Tiếng Việt đầu tiên
    const firstSub = data.subtitles.find((sub: any) => sub.language.toLowerCase() === "vietnamese") || data.subtitles[0];
    const zipUrl = `https://dl.subdl.com${firstSub.url}`;

    // 2. Tải file ZIP
    const zipRes = await fetch(zipUrl);
    if (!zipRes.ok) {
      throw new Error(`Failed to download ZIP: ${zipRes.statusText}`);
    }
    
    const arrayBuffer = await zipRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Giải nén bằng adm-zip
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    // Tìm file .srt
    const srtEntry = zipEntries.find(entry => entry.entryName.toLowerCase().endsWith(".srt"));
    
    if (!srtEntry) {
      throw new Error("No .srt file found in ZIP");
    }

    // Đọc nội dung file srt
    const srtText = srtEntry.getData().toString("utf8");

    // Lấy các tuỳ chỉnh
    const shiftMs = parseInt(searchParams.get("offset") || "0");
    const fs = searchParams.get("fs") || "24px";
    const color = searchParams.get("c") || "#ffffff";
    const bg = searchParams.get("bg") || "transparent";
    const shadow = searchParams.get("b") || "2px 2px 4px #000000";

    const vttStyle = `STYLE
::cue {
  font-size: ${fs};
  color: ${color};
  background-color: ${bg};
  text-shadow: ${shadow};
}

`;

    // 4. Chuyển đổi SRT sang VTT
    const parsedText = srtText.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, (match, h, m, s, ms) => {
      let total = parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms) + shiftMs;
      if (total < 0) total = 0;
      const nh = Math.floor(total / 3600000).toString().padStart(2, '0');
      const nm = Math.floor((total % 3600000) / 60000).toString().padStart(2, '0');
      const ns = Math.floor((total % 60000) / 1000).toString().padStart(2, '0');
      const nms = (total % 1000).toString().padStart(3, '0');
      return `${nh}:${nm}:${ns}.${nms}`;
    });

    const vttText = "WEBVTT\n\n" + vttStyle + parsedText;

    if (serve === "vtt") {
      return new NextResponse(vttText, {
        headers: {
          "Content-Type": "text/vtt",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Nếu không yêu cầu trả về VTT trực tiếp, trả về danh sách
    const baseUrl = new URL(req.url).origin;
    return NextResponse.json({
      subtitles: [
        {
          file: `${baseUrl}/api/subtitles?imdbId=${imdbId}${season ? `&season=${season}` : ''}${episode ? `&episode=${episode}` : ''}&serve=vtt`,
          label: "Vietnamese (SubDL)",
          kind: "captions"
        }
      ]
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400"
      }
    });

  } catch (error: any) {
    console.error("SubDL Error:", error);
    if (serve === "vtt") {
      return new NextResponse("WEBVTT\n\nNOTE Error loading subtitles", { headers: { "Content-Type": "text/vtt" } });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
