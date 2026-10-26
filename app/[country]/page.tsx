import { notFound } from "next/navigation";
import { getQuocGiaDetails } from "@/lib/api"; // API helper for country list
import MovieCardWrapper from "@/components/MovieCardWrapper";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ country: string }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const resolvedParams = await params;
  const name = resolvedParams.country.replace(/^phim-/, "").replace(/-/g, " ");
  return {
    title: `Phim ${name}`,
    description: `Danh sách phim ${name} trên Movie Hub`,
  };
};

export default async function CountryPage({ params }: Props) {
  // URL pattern is /phim-<slug>
  // Remove the "phim-" prefix to obtain the country slug used by the API
  const resolvedParams = await params;
  const slug = resolvedParams.country.replace(/^phim-/, "");

  // Fetch movies for the country (page 1, limit 24 by default)
  const data = await getQuocGiaDetails(slug, { page: 1, limit: 24 });

  if (!data?.data?.items?.length) {
    // No data → 404 page
    notFound();
    return null; // unreachable but satisfies TS
  }

  return (
    <section className="py-8">
      <h1 className="text-2xl font-bold mb-6 capitalize">
        Phim {slug.replace(/-/g, " ")}
      </h1>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {data.data.items.map((movie) => (
          <MovieCardWrapper key={movie._id} movie={movie} />
        ))}
      </div>
    </section>
  );
}
