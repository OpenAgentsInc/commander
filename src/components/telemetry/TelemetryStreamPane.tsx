import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, Clock, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TelemetryEvent {
  id: string;
  timestamp: number;
  category: string;
  action: string;
  label?: string;
  value?: string | number | boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
  context?: Record<string, any>;
}

interface TelemetryStreamPaneProps {
  runId?: string;
  autoScroll?: boolean;
  maxEvents?: number;
}

export const TelemetryStreamPane: React.FC<TelemetryStreamPaneProps> = ({
  runId,
  autoScroll = true,
  maxEvents = 1000
}) => {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TelemetryEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for telemetry events
  useEffect(() => {
    // TODO: Hook up to actual telemetry IPC channel
    // For now, create some sample events for testing
    const sampleEvents: TelemetryEvent[] = [
      {
        id: '1',
        timestamp: Date.now() - 60000,
        category: 'swebench',
        action: 'evaluation_start',
        label: 'test-run-123',
        level: 'info',
        context: { runId: 'test-run-123', instances: 50 }
      },
      {
        id: '2',
        timestamp: Date.now() - 50000,
        category: 'swebench',
        action: 'patch_generation_start',
        label: 'django__django-11099',
        level: 'info',
        context: { repo: 'django/django' }
      },
      {
        id: '3',
        timestamp: Date.now() - 40000,
        category: 'swebench',
        action: 'patch_generated',
        label: 'django__django-11099',
        value: 910,
        level: 'info',
        context: { success: true, patchSize: 910 }
      }
    ];
    
    // Add sample events if no events yet
    if (events.length === 0) {
      setEvents(sampleEvents);
    }
  }, []);

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = events;

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(e => e.level === levelFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.action.toLowerCase().includes(search) ||
        e.label?.toLowerCase().includes(search) ||
        e.category.toLowerCase().includes(search) ||
        JSON.stringify(e.context).toLowerCase().includes(search)
      );
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, levelFilter, categoryFilter]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEvents, autoScroll]);

  // Get unique categories
  const categories = ['all', ...new Set(events.map(e => e.category))];

  // Toggle event expansion
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Get icon for level
  const getLevelIcon = (level?: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug': return <Info className="h-4 w-4 text-gray-500" />;
      default: return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get badge variant for level
  const getLevelVariant = (level?: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      case 'debug': return 'outline';
      default: return 'outline';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Telemetry Stream
            {runId && <span className="ml-2 text-sm text-muted-foreground">({runId})</span>}
          </CardTitle>
          <Badge variant="outline">
            {filteredEvents.length} / {events.length} events
          </Badge>
        </div>
        
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Level: {levelFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setLevelFilter('all')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLevelFilter('debug')}>Debug</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLevelFilter('info')}>Info</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLevelFilter('warn')}>Warning</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLevelFilter('error')}>Error</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Category: {categoryFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map(cat => (
                <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No telemetry events yet...
              </div>
            ) : (
              filteredEvents.map(event => (
                <Collapsible
                  key={event.id}
                  open={expandedEvents.has(event.id)}
                  onOpenChange={() => toggleEventExpansion(event.id)}
                >
                  <div className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {expandedEvents.has(event.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            {getLevelIcon(event.level)}
                            <span className="text-xs text-muted-foreground">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {formatTimestamp(event.timestamp)}
                            </span>
                            <Badge variant={getLevelVariant(event.level)} className="text-xs">
                              {event.category}
                            </Badge>
                            <span className="font-medium text-sm">{event.action}</span>
                          </div>
                          
                          {event.label && (
                            <div className="text-sm text-muted-foreground ml-6">
                              {event.label}
                              {event.value !== undefined && (
                                <span className="ml-2 font-mono text-xs">
                                  = {String(event.value)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      {event.context && Object.keys(event.context).length > 0 && (
                        <div className="mt-3 ml-6 p-3 bg-muted rounded-md">
                          <div className="text-xs font-mono">
                            <pre>{JSON.stringify(event.context, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TelemetryStreamPane;