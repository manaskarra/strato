'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkflowTemplate } from '@/lib/types';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateGalleryProps {
  templates: WorkflowTemplate[];
  onSelect: (id: string) => void;
}

const difficultyColors = {
  beginner: 'bg-emerald-500/20 text-emerald-500',
  intermediate: 'bg-blue-500/20 text-blue-500',
  advanced: 'bg-red-500/20 text-red-500',
};

export function TemplateGallery({ templates, onSelect }: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
      {templates.map((template) => (
        <Card key={template.id} className="hover:border-blue-500/30 transition-all group cursor-pointer" onClick={() => onSelect(template.id)}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-foreground">{template.name}</h3>
                  <Badge className={cn('text-[10px] border-0', difficultyColors[template.difficulty])}>{template.difficulty}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{template.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <BookOpen className="w-3 h-3" />
                {template.nodes.length} nodes &middot; {template.edges.length} connections
              </div>
              <Badge variant="secondary" className="text-[10px]">{template.category}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
