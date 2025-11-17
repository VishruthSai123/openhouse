// Format AI response text with proper markdown-like formatting and clickable links
export function formatAIResponse(text: string): JSX.Element {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];
  let listType: 'bullet' | 'number' | null = null;

  // Convert URLs to clickable links
  const formatTextWithLinks = (text: string): (string | JSX.Element)[] => {
    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const flushList = (index: number) => {
    if (currentList.length > 0) {
      if (listType === 'bullet') {
        elements.push(
          <ul key={`list-${index}`} className="space-y-1.5 sm:space-y-2 my-2 sm:my-3 ml-3 sm:ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="flex gap-1.5 sm:gap-2">
                <span className="text-primary mt-0.5 sm:mt-1 text-xs sm:text-sm">•</span>
                <span className="flex-1 text-xs sm:text-sm">{formatTextWithLinks(item)}</span>
              </li>
            ))}
          </ul>
        );
      } else if (listType === 'number') {
        elements.push(
          <ol key={`list-${index}`} className="space-y-1.5 sm:space-y-2 my-2 sm:my-3 ml-3 sm:ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="flex gap-1.5 sm:gap-2">
                <span className="text-primary font-medium min-w-[16px] sm:min-w-[20px] text-xs sm:text-sm">{i + 1}.</span>
                <span className="flex-1 text-xs sm:text-sm">{formatTextWithLinks(item)}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      flushList(index);
      return;
    }

    // Headers (## or **text**)
    if (trimmed.startsWith('##')) {
      flushList(index);
      const text = trimmed.replace(/^##\s*/, '').replace(/\*\*/g, '');
      elements.push(
        <h3 key={index} className="text-sm sm:text-base font-bold mt-3 sm:mt-4 mb-1.5 sm:mb-2 text-foreground break-words">
          {formatTextWithLinks(text)}
        </h3>
      );
    }
    // Bold section headers (**text:**)
    else if (trimmed.match(/^\*\*.*?\*\*:?$/)) {
      flushList(index);
      const text = trimmed.replace(/\*\*/g, '').replace(/:$/, '');
      elements.push(
        <h4 key={index} className="text-xs sm:text-sm font-semibold mt-2 sm:mt-3 mb-1 sm:mb-1.5 text-primary break-words">
          {formatTextWithLinks(text)}
        </h4>
      );
    }
    // Bullet points (- or • or *)
    else if (trimmed.match(/^[-•*]\s/)) {
      const text = trimmed.replace(/^[-•*]\s/, '').replace(/\*\*/g, '');
      if (listType !== 'bullet') {
        flushList(index);
        listType = 'bullet';
      }
      currentList.push(text);
    }
    // Numbered lists (1. 2. etc)
    else if (trimmed.match(/^\d+\.\s/)) {
      const text = trimmed.replace(/^\d+\.\s/, '').replace(/\*\*/g, '');
      if (listType !== 'number') {
        flushList(index);
        listType = 'number';
      }
      currentList.push(text);
    }
    // Quote or callout
    else if (trimmed.startsWith('>')) {
      flushList(index);
      const text = trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '');
      elements.push(
        <div key={index} className="border-l-2 sm:border-l-3 border-primary bg-primary/5 px-2 sm:px-4 py-1.5 sm:py-2 my-1.5 sm:my-2 rounded-r-lg">
          <p className="text-xs sm:text-sm italic text-muted-foreground break-words">{formatTextWithLinks(text)}</p>
        </div>
      );
    }
    // Regular paragraph with inline formatting
    else {
      flushList(index);
      // Remove ** for bold, keep text as is
      const cleanText = trimmed.replace(/\*\*/g, '');
      
      // Check if it's a key-value pair (text: value)
      if (cleanText.includes(':') && cleanText.split(':')[0].length < 30) {
        const [key, ...valueParts] = cleanText.split(':');
        const value = valueParts.join(':').trim();
        elements.push(
          <p key={index} className="text-xs sm:text-sm my-1.5 sm:my-2 break-words">
            <span className="font-medium text-foreground">{key}:</span>{' '}
            <span className="text-muted-foreground">{formatTextWithLinks(value)}</span>
          </p>
        );
      } else {
        elements.push(
          <p key={index} className="text-xs sm:text-sm my-1.5 sm:my-2 leading-relaxed text-muted-foreground break-words">
            {formatTextWithLinks(cleanText)}
          </p>
        );
      }
    }
  });

  flushList(lines.length);

  return <div className="space-y-1">{elements}</div>;
}
