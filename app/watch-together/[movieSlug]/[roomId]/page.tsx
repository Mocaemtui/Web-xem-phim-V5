import { notFound } from "next/navigation";
import { getChiTietPhim, getPosterUrl } from "@/lib/api";
import WatchTogetherClient from "@/components/WatchTogetherClient";

interface PageProps {
  params: Promise<{
    movieSlug: string;
    roomId: string;
  }>;
}

export default async function WatchTogetherPage({ params }: PageProps) {
  const { movieSlug, roomId } = await params;
  const decodedSlug = decodeURIComponent(movieSlug);

  if (!decodedSlug || !roomId) {
    notFound();
  }

  const movieData = await getChiTietPhim(decodedSlug);

  if (!movieData || !movieData.data || !movieData.data.item) {
    notFound();
  }

  const movie = movieData.data.item;
  const posterUrl = getPosterUrl(movie);

  // Lọc bỏ Nguồn C khỏi tính năng Xem Chung do không đồng bộ được IFrame
  if (movie.episodes) {
    movie.episodes = movie.episodes.filter(
      (ep) => !ep.server_name.toLowerCase().includes("nguồn c") && !ep.server_name.toLowerCase().includes("nguonc")
    );
  }

  return (
    <WatchTogetherClient movie={movie} posterUrl={posterUrl} roomId={roomId} />
  );
}
