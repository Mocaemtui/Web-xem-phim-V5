import MovieCardWrapper from "@/components/MovieCardWrapper";
import SectionTitle from "@/components/SectionTitle";
import { getPhimByTheLoai } from "@/lib/api";

export const revalidate = 86400; // Cache trang thể loại 24 giờ

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TheLoaiDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const moviesData = await getPhimByTheLoai(slug, 1, 24);

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionTitle title={moviesData?.data?.items?.[0]?.category?.[0]?.name || "Phim theo thể loại"} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {moviesData?.data?.items?.map((movie) => (
          <MovieCardWrapper key={movie._id} movie={movie} />
        )) || []}
      </div>
    </div>
  );
}
