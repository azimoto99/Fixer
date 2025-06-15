export interface Review {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5 stars
  comment?: string;
  reviewType: ReviewType;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  reviewee?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  job?: {
    id: string;
    title: string;
    category: string;
  };
}

export type ReviewType = 'worker_to_poster' | 'poster_to_worker';

export interface CreateReviewRequest {
  jobId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  reviewType: ReviewType;
  isPublic?: boolean;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
  isPublic?: boolean;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentReviews: Review[];
}

export interface ReviewFilters {
  rating?: number;
  reviewType?: ReviewType;
  dateFrom?: string;
  dateTo?: string;
  isPublic?: boolean;
}

export interface ReviewSearchRequest {
  userId: string;
  filters?: ReviewFilters;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'rating';
  sortOrder?: 'asc' | 'desc';
}
