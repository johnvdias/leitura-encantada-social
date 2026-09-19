import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFriendships } from "@/hooks/useFriendships";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

// Textarea com autocomplete de @menção: digitar "@" seguido de letras abre
// uma lista dos amigos que batem com o que foi digitado, pra escolher em
// vez de precisar saber o nome de usuário exato de cor.
export function MentionTextarea({ value, onChange, placeholder, rows = 2, className }: MentionTextareaProps) {
  const { friends } = useFriendships();
  const [query, setQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = query === null
    ? []
    : friends
        .filter((f) => {
          const q = query.toLowerCase();
          return (
            f.friend.username?.toLowerCase().startsWith(q) ||
            f.friend.display_name?.toLowerCase().startsWith(q)
          );
        })
        .slice(0, 5);

  const updateMentionQuery = (text: string, cursor: number) => {
    const beforeCursor = text.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.]*)$/);
    setQuery(match ? match[1] : null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    updateMentionQuery(e.target.value, e.target.selectionStart);
  };

  const selectMention = (username: string | null) => {
    if (!username || !textareaRef.current) return;

    const cursor = textareaRef.current.selectionStart;
    const beforeCursor = value.slice(0, cursor);
    const afterCursor = value.slice(cursor);
    const newBefore = beforeCursor.replace(/@([a-zA-Z0-9_.]*)$/, `@${username} `);

    const newValue = newBefore + afterCursor;
    onChange(newValue);
    setQuery(null);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const newCursor = newBefore.length;
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {query !== null && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-w-xs rounded-md border bg-popover shadow-md overflow-hidden">
          {suggestions.map((f) => (
            <button
              key={f.friend.user_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectMention(f.friend.username)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={f.friend.avatar_url ?? undefined} />
                <AvatarFallback>{f.friend.display_name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{f.friend.display_name}</span>
              {f.friend.username && (
                <span className="text-muted-foreground">@{f.friend.username}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
