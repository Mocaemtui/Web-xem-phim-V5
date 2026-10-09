export default function Footer() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Mocaemtui";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 border-t border-zinc-800 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-zinc-400 text-sm">
            © {currentYear} {siteName}. All rights reserved.
          </p>
          <p className="text-zinc-600 text-xs mt-2">
            Xem phim online miễn phí với chất lượng cao
          </p>
        </div>
      </div>
    </footer>
  );
}
