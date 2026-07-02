export interface GalleryImage {
  id: string;
  url: string;
  category?: string;
  isHero?: boolean;
  isSectionHero?: boolean;
  caption?: string;
  order?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  createdAt?: string | number;
  title?: string;
  ownerId?: string;
  isSection?: boolean;
}
