import MovieCardWrapper from "@/components/MovieCardWrapper";
import SectionTitle from "@/components/SectionTitle";
import { getPhimByNam } from "@/lib/api";

export const revalidate = 86400; // Cache trang năm 24 giờ

interface PageProps {
  params: Promise<{
    year: string;
  }>;
}

export default async function NamDetailPage({ params }: PageProps) {
  const { year } = await params;
  const yearNum = parseInt(year);
  const moviesData = await getPhimByNam(yearNum, 1, 24);

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionTitle title={`Phim năm ${year}`} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {moviesData?.data?.items?.map((movie) => (
          <MovieCardWrapper key={movie._id} movie={movie} />
        )) || []}
      </div>
    </div>
  );
}
