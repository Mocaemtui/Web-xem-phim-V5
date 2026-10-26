import SearchGrid from "@/components/SearchGrid";
import SectionTitle from "@/components/SectionTitle";
import { searchPhim } from "@/lib/api";

export const revalidate = 86400; // Cache trang tìm kiếm 24 giờ

interface PageProps {
  params: Promise<{
    keyword: string;
  }>;
  searchParams: Promise<{
    fromSeason?: string;
    movieName?: string;
  }>;
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { keyword } = await params;
  const { fromSeason, movieName } = await searchParams;
  const decodedKeyword = decodeURIComponent(keyword);
  const searchResults = await searchPhim(decodedKeyword);

  const titleText = fromSeason && movieName
    ? `Các phần phim của "${decodeURIComponent(movieName)}"`
    : `Kết quả tìm kiếm: "${decodedKeyword}"`;

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionTitle title={titleText} />
      
      <SearchGrid 
        key={decodedKeyword}
        initialMovies={searchResults?.data?.items || []} 
        keyword={decodedKeyword} 
      />
    </div>
  );
}
