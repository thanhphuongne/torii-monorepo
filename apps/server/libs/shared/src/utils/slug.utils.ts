import slugify from 'slugify';

/**
 * Generate URL-friendly slug from title
 * Handles Vietnamese characters and special cases like "đ" and "d"
 * @param title - The title to convert to slug
 * @returns URL-friendly slug
 */
export function generateSlug(title: string): string {
  if (!title || typeof title !== 'string') {
    throw new Error('Title is required and must be a string');
  }

  // slugify with options to handle Vietnamese characters properly
  // locale: 'vi' handles Vietnamese characters like đ, ư, ơ, etc.
  // lower: true converts to lowercase
  // strict: true removes special characters
  // trim: true removes leading/trailing spaces
  const slug = slugify(title, {
    locale: 'vi',
    lower: true,
    strict: true,
    trim: true,
  });

  // Ensure max length of 255 characters (database constraint)
  return slug.substring(0, 255);
}
