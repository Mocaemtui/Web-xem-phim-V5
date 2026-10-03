import MovieSlider from "@/components/MovieSlider";
import SectionTitle from "@/components/SectionTitle";
import HomeHistorySection from "@/components/HomeHistorySection";
import HeroBanner from "@/components/HeroBanner";
import { getPhimMoi, getDanhSach, getQuocGiaDetails } from "@/lib/api";

export const revalidate = 86400; // Cache trang chủ 24 giờ trên CDN để tiết kiệm CPU Vercel

export default async function Home() {
  const [
    phimMoiData,
    bannerHoatHinhData,
    phimVietData,
    phimAuMyData,
    phimHanData,
    phimNhatData,
    phimTrungData,
    animeData,
    cartoonData,
    longTiengData,
    thuyetMinhData,
    tvShowsData,
  ] = await Promise.all([
    getPhimMoi(1, 30), // Fetch 30 items for slider
    getDanhSach("hoat-hinh", { page: 1, limit: 50 }), // Banner pool
    getQuocGiaDetails("viet-nam", { page: 1, limit: 12 }),
    getQuocGiaDetails("au-my", { page: 1, limit: 12 }),
    getQuocGiaDetails("han-quoc", { page: 1, limit: 12 }),
    getQuocGiaDetails("nhat-ban", { page: 1, limit: 12 }),
    getQuocGiaDetails("trung-quoc", { page: 1, limit: 12 }),
    getDanhSach("hoat-hinh", { page: 1, limit: 12, country: "nhat-ban" }),
    getDanhSach("hoat-hinh", { page: 1, limit: 30, country: "au-my" }),
    getDanhSach("phim-long-tieng", { page: 1, limit: 12 }),
    getDanhSach("phim-thuyet-minh", { page: 1, limit: 12 }),
    getDanhSach("tv-shows", { page: 1, limit: 12 }),
  ]);

  if (!phimMoiData || !phimMoiData.data?.items) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p className="text-zinc-400 text-lg">
            Không thể tải dữ liệu từ API. Vui lòng thử lại sau.
          </p>
        </div>
      </div>
    );
  }

  const allPhimMoi = phimMoiData.data.items;
  
  // Combine sources to create a larger, more diverse pool for the banner
  const bannerPool = [
    ...allPhimMoi, 
    ...(phimAuMyData?.data?.items || []), 
    ...(phimNhatData?.data?.items || [])
  ];
  
  // Remove duplicates
  const uniquePool = Array.from(new Map(bannerPool.map(m => [m.slug, m])).values());
  
  const heroMovies: any[] = [];
  const sliderPhimMoi: any[] = [];
  
  // Banner pool: 50 hoạt hình mới nhất, lọc bỏ phim Trung Quốc
  const eligibleForBanner = (bannerHoatHinhData?.data?.items || [])
    .filter(movie => !movie.country?.some(c => c.slug === 'trung-quoc'));
  
  // Pick the top 15 for the hero banner to have backups in case some are blocked by YouTube
  for (const movie of eligibleForBanner) {
    if (heroMovies.length < 15) {
      heroMovies.push(movie);
    }
  }
  
  // Populate the slider with new movies that are NOT in the hero banner
  for (const movie of allPhimMoi) {
    if (!heroMovies.some(h => h.slug === movie.slug)) {
      sliderPhimMoi.push(movie);
    }
  }

  return (
    <div className="overflow-hidden bg-black pb-16">
      {/* Hero Banner (Featured Movies Carousel) */}
      {heroMovies.length > 0 && <HeroBanner movies={heroMovies} />}

      <div className="container mx-auto px-4 mt-4 sm:-mt-10 relative z-20">
        {/* 1. Lịch Sử Section (Client-side) */}
        <HomeHistorySection />

        {/* 2. Anime Section */}
        <section className="mb-14">
          <SectionTitle title="Anime" viewAllLink="/anime" />
          <MovieSlider movies={animeData?.data?.items || []} />
        </section>

        {/* 3. Cartoon Section */}
        <section className="mb-14">
          <SectionTitle title="Cartoon" viewAllLink="/cartoon" />
          <MovieSlider movies={(cartoonData?.data?.items || []).filter(movie => !movie.country?.some(c => c.slug === 'nhat-ban'))} />
        </section>

        {/* 5. Phim Việt Section */}
        <section className="mb-14">
          <SectionTitle title="Phim Việt" viewAllLink="/phim-viet" />
          <MovieSlider movies={phimVietData?.data?.items || []} />
        </section>

        {/* 6. Phim Âu Mỹ Section */}
        <section className="mb-14">
          <SectionTitle title="Phim Âu Mỹ" viewAllLink="/phim-au-my" />
          <MovieSlider movies={phimAuMyData?.data?.items || []} />
        </section>

        {/* 7. Phim Nhật Section */}
        <section className="mb-14">
          <SectionTitle title="Phim Nhật" viewAllLink="/phim-nhat" />
          <MovieSlider movies={phimNhatData?.data?.items || []} />
        </section>

        {/* 8. Phim Hàn Section */}
        <section className="mb-14">
          <SectionTitle title="Phim Hàn" viewAllLink="/phim-han" />
          <MovieSlider movies={phimHanData?.data?.items || []} />
        </section>

        {/* 9. Phim Trung Section */}
        <section className="mb-14">
          <SectionTitle title="Phim Trung" viewAllLink="/phim-trung" />
          <MovieSlider movies={phimTrungData?.data?.items || []} />
        </section>

        {/* TV Shows Section */}
        <section className="mb-14">
          <SectionTitle title="TV Shows" viewAllLink="/tv-shows" />
          <MovieSlider movies={tvShowsData?.data?.items || []} />
        </section>

        {/* 10. Phim Thuyết Minh Section */}
        <section className="mb-14">
          <SectionTitle title="Phim Thuyết Minh" viewAllLink="/phim-thuyet-minh" />
          <MovieSlider movies={thuyetMinhData?.data?.items || []} />
        </section>

        {/* 11. Phim Lồng Tiếng Section */}
        <section className="mb-14">
          <SectionTitle title="Phim Lồng Tiếng" viewAllLink="/phim-long-tieng" />
          <MovieSlider movies={longTiengData?.data?.items || []} />
        </section>
      </div>
    </div>
  );
}
