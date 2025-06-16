import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDistance, truncateText } from "@/lib/utils";
import { MapPin, Clock, DollarSign, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import type { Job } from '@fixer/shared';

export interface JobCardProps extends Job {
  distance?: number;
}

export function JobCard(job: JobCardProps) {
  const {
    id,
    title,
    description,
    category,
    budget,
    location,
    distance,
    urgency,
    createdAt,
  } = job;

  // Determine urgency badge color
  const urgencyColor = {
    low: "bg-secondary text-secondary-foreground",
    medium: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    urgent: "bg-destructive text-destructive-foreground",
  }[urgency];

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{title}</CardTitle>
          <span className={`text-xs px-2 py-1 rounded-full ${urgencyColor} capitalize`}>
            {urgency}
          </span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground mt-1">
          <MapPin className="h-3.5 w-3.5 mr-1" />
          <span>{location.city}, {location.state}</span>
          {distance && (
            <>
              <span className="mx-1">•</span>
              <span>{formatDistance(distance)}</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground mb-4">
          {truncateText(description, 120)}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="flex items-center text-sm">
            <DollarSign className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <span className="font-medium">
              {budget.amount ? formatCurrency(budget.amount) : 
               budget.minAmount && budget.maxAmount ? 
               `${formatCurrency(budget.minAmount)} - ${formatCurrency(budget.maxAmount)}` :
               'Negotiable'}
            </span>
            <span className="text-muted-foreground ml-1">
              {budget.type === 'hourly' ? '/hr' : ''}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Tag className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <span className="capitalize">{category.replace('_', ' ')}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 mr-1" />
            <span>Posted {new Date(createdAt).toLocaleDateString()}</span>
          </div>
          <Button asChild size="sm">
            <Link to={`/jobs/${id}`}>View Details</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}