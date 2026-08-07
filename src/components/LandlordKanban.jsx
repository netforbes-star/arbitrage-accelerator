import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Mail } from "lucide-react";

export default function LandlordKanban({ landlords, stages, onMove, onLog }) {
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    onMove(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
        {stages.map((stage) => {
          const items = landlords.filter((l) => l.stage === stage);
          return (
            <div key={stage} className="shrink-0 w-[260px] sm:w-60 snap-start">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-brand-mutedtext uppercase tracking-wide">{stage}</span>
                <Badge variant="secondary" className="bg-brand-raised text-brand-mutedtext">{items.length}</Badge>
              </div>
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[80px] space-y-2 p-1.5 rounded-lg border transition-colors ${
                      snapshot.isDraggingOver ? "border-brand-gold bg-brand-gold/5" : "border-brand-line bg-brand-ink/40"
                    }`}
                  >
                    {items.length === 0 && (
                      <div className="text-xs text-brand-mutedtext/60 text-center py-4">Drop here</div>
                    )}
                    {items.map((l, index) => (
                      <Draggable key={l.id} draggableId={l.id} index={index}>
                        {(p, s) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            style={{ ...p.draggableProps.style }}
                          >
                            <Card
                              className={`border-brand-line cursor-grab active:cursor-grabbing select-none ${
                                s.isDragging ? "border-brand-gold shadow-lg opacity-90" : "hover:border-brand-gold"
                              }`}
                            >
                              <CardContent className="py-2.5">
                                <div className="flex items-start gap-1.5">
                                  <GripVertical className="w-3.5 h-3.5 text-brand-mutedtext/60 mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-brand-text truncate">{l.name}</div>
                                    <div className="text-xs text-brand-mutedtext truncate">
                                      {l.type === "pm" ? "PM Co" : "Private"}{l.company ? ` · ${l.company}` : ""}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onLog(l.id); }}
                                    className="shrink-0 p-1 rounded text-brand-mutedtext hover:text-brand-gold hover:bg-brand-raised"
                                    title="Log touch"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}