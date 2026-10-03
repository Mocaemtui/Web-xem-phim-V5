export default function myImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // Bỏ qua nếu là ảnh cục bộ hoặc data URI
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  // Nếu là ảnh từ TMDB, sử dụng API resize gốc của TMDB
  if (src.includes("image.tmdb.org")) {
    if (width <= 342) return src.replace("/original/", "/w342/");
    if (width <= 500) return src.replace("/original/", "/w500/");
    if (width <= 780) return src.replace("/original/", "/w780/");
    return src;
  }

  // Sử dụng CDN miễn phí wsrv.nl để tối ưu hóa ảnh (resize, convert sang webp)
  // Việc này tăng tốc độ tải mà không tiêu tốn giới hạn Data Transfer hay Image Optimization của Vercel
  const cleanUrl = src.replace(/^https?:\/\//, "");
  const q = quality || 75;
  // wsrv.nl hỗ trợ output=webp để giảm dung lượng đáng kể
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${q}&output=webp`;
}
