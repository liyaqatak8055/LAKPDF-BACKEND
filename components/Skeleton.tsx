import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  animate = true,
}) => {
  const baseClass = `bg-slate-200 ${animate ? 'skeleton' : ''}`;
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height || (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={`${baseClass} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Tool Card Skeleton
export const ToolCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton variant="rectangular" width={60} height={20} className="rounded-full" />
      </div>
      <Skeleton width="70%" height={24} className="mb-3" />
      <Skeleton width="100%" height={16} className="mb-2" />
      <Skeleton width="80%" height={16} className="mb-4" />
      <Skeleton width={100} height={20} />
    </div>
  );
};

// File Uploader Skeleton
export const FileUploaderSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center h-80">
      <Skeleton variant="circular" width={60} height={60} className="mx-auto mb-6" />
      <Skeleton width="50%" height={32} className="mx-auto mb-3" />
      <Skeleton width="70%" height={20} className="mx-auto mb-8" />
      <Skeleton width={140} height={48} className="mx-auto rounded-xl" />
    </div>
  );
};

// Page Header Skeleton
export const PageHeaderSkeleton: React.FC = () => {
  return (
    <div className="text-center mb-12">
      <Skeleton width={200} height={40} className="mx-auto mb-4" />
      <Skeleton width="100%" height={20} className="mx-auto mb-2" />
      <Skeleton width="80%" height={20} className="mx-auto" />
    </div>
  );
};

// Dashboard Stats Skeleton
export const DashboardStatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-4 rounded-xl border border-slate-200">
          <Skeleton variant="circular" width={40} height={40} className="mb-3" />
          <Skeleton width={60} height={24} className="mb-1" />
          <Skeleton width={80} height={14} />
        </div>
      ))}
    </div>
  );
};

// Recent Files Skeleton
export const RecentFilesSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={120} height={24} />
        <Skeleton width={80} height={16} />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
            <div className="flex-1">
              <Skeleton width="70%" height={16} className="mb-1" />
              <Skeleton width={100} height={12} />
            </div>
            <Skeleton width={60} height={20} className="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Tool Grid Skeleton
export const ToolGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ToolCardSkeleton key={i} />
      ))}
    </div>
  );
};

// Stats Card Skeleton
export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton width={80} height={16} className="rounded-full" />
      </div>
      <Skeleton width={100} height={36} className="mb-2" />
      <Skeleton width={140} height={14} />
    </div>
  );
};

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ cols: number }> = ({ cols }) => {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton width={i === 0 ? 40 : '80%'} height={16} />
        </td>
      ))}
    </tr>
  );
};

// Feature Card Skeleton
export const FeatureCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <Skeleton variant="circular" width={56} height={56} className="mb-4" />
      <Skeleton width="70%" height={24} className="mb-3" />
      <Skeleton width="100%" height={16} className="mb-2" />
      <Skeleton width="90%" height={16} />
    </div>
  );
};

