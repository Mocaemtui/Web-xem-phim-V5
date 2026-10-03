import MovieCardWrapper from "@/components/MovieCardWrapper";
import SectionTitle from "@/components/SectionTitle";
import BackButton from "@/components/BackButton";
import Pagination from "@/components/Pagination";
import { getQuocGiaDetails } from "@/lib/api";

interface PageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function PhimAuMyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const moviesData = await getQuocGiaDetails("au-my", { page, limit: 30 });

  const pagination = moviesData?.data?.params?.pagination;
  const currentPage = pagination?.currentPage || page;
  const totalItems = pagination?.totalItems || 0;
  const totalItemsPerPage = pagination?.totalItemsPerPage || 30;
  const totalPages = Math.ceil(totalItems / totalItemsPerPage) || 1;
  const formattedTotal = Number(totalItems).toLocaleString('en-US');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Nút thoát / quay lại */}
      <div className="mb-6">
        <BackButton fallbackUrl="/" label="Quay lại Trang chủ" />
      </div>
      <SectionTitle title="Phim Âu Mỹ" />
      <div className="text-white text-sm mb-4">
        Hiển thị {(currentPage - 1) * totalItemsPerPage + 1}-{Math.min(currentPage * totalItemsPerPage, totalItems)} của {formattedTotal} phim
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {moviesData?.data?.items?.map((movie) => (
          <MovieCardWrapper key={movie._id} movie={movie} />
        )) || []}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        baseUrl="/phim-au-my"
      />
    </div>
  );
}
