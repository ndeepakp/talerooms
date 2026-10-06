import { BookPreview, type BookPreviewStory } from "./BookPreview";

export function FeaturedBookPreview({ story }: { story: BookPreviewStory }) {
  return <BookPreview story={story} variant="featured" />;
}
