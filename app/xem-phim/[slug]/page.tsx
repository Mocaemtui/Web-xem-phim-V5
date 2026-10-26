import { notFound } from "next/navigation";
import WatchPageClient from "@/components/WatchPageClient";
import { getChiTietPhim, getPosterUrl } from "@/lib/api";
import { getTMDBDetails, resolveTMDBId, getTMDBSeasonDetails } from "@/lib/tmdb";

export const revalidate = 86400; // Cache trang xem phim 24 giờ để giảm Function Invocations

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  if (!decodedSlug || decodedSlug === "undefined") {
    return {};
  }

  const movieData = await getChiTietPhim(decodedSlug);
  if (!movieData || !movieData.data || !movieData.data.item) {
    return {};
  }

  const movie = movieData.data.item;
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Mocaemtui";
  const title = `Xem Phim ${movie.name} - ${movie.origin_name || ""} FULL HD | ${siteName}`;
  const description = `Xem phim online ${movie.name} (${movie.origin_name || ""}) - ${movie.year} ${movie.quality || "HD"} ${movie.lang || "Vietsub"} chất lượng cao, không giật lag.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: movie.thumb_url || movie.poster_url || "",
          alt: movie.name,
        },
      ],
    },
  };
}

export default async function WatchPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  if (!decodedSlug || decodedSlug === "undefined") {
    notFound();
  }

  const movieData = await getChiTietPhim(decodedSlug);

  if (!movieData || !movieData.data || !movieData.data.item) {
    notFound();
  }

  const movie = movieData.data.item;
  const posterUrl = getPosterUrl(movie);

  let tmdbData = null;
  let seasonData = null;
  let tmdbCollectionData = null;
  const resolvedTMDB = await resolveTMDBId(movie);
  if (resolvedTMDB) {
    tmdbData = await getTMDBDetails(resolvedTMDB.id, resolvedTMDB.type);
    
    if (resolvedTMDB.type === "tv") {
      // Use extracted season from name, fallback to tmdb.season, fallback to 1
      const seasonNumber = resolvedTMDB.season || movie.tmdb?.season || 1;
      seasonData = await getTMDBSeasonDetails(resolvedTMDB.id, seasonNumber);
    } else if (tmdbData?.belongs_to_collection?.id) {
      const { getTMDBCollection } = await import("@/lib/tmdb");
      tmdbCollectionData = await getTMDBCollection(tmdbData.belongs_to_collection.id);
    }
  }

  return (
    <>
      <WatchPageClient movie={movie} posterUrl={posterUrl} tmdbData={tmdbData} seasonData={seasonData} tmdbCollectionData={tmdbCollectionData} />
    </>
  );
}
