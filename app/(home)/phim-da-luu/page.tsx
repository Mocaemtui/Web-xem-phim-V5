import { redirect } from "next/navigation";

export default function BookmarksRedirect() {
  redirect("/ca-nhan?tab=bookmarks");
}
