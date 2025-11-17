// Format AI response text with proper markdown-like formatting
export function formatAIResponse(text: string): JSX.Element {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];
  let listType: 'bullet' | 'number' | null = null;

  const flushList = (index: number) => {
    if (currentList.length > 0) {
      if (listType === 'bullet') {
        elements.push(
          <ul key={`list-${index}`} className="space-y-2 my-3 ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        );
      } else if (listType === 'number') {
        elements.push(
          <ol key={`list-${index}`} className="space-y-2 my-3 ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary font-medium min-w-[20px]">{i + 1}.</span>
                <span className="flex-1">{item}</span>
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
        <h3 key={index} className="text-base font-bold mt-4 mb-2 text-foreground">
          {text}
        </h3>
      );
    }
    // Bold section headers (**text:**)
    else if (trimmed.match(/^\*\*.*?\*\*:?$/)) {
      flushList(index);
      const text = trimmed.replace(/\*\*/g, '').replace(/:$/, '');
      elements.push(
        <h4 key={index} className="text-sm font-semibold mt-3 mb-1.5 text-primary">
          {text}
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
        <div key={index} className="border-l-3 border-primary bg-primary/5 px-4 py-2 my-2 rounded-r-lg">
          <p className="text-sm italic text-muted-foreground">{text}</p>
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
          <p key={index} className="text-sm my-2">
            <span className="font-medium text-foreground">{key}:</span>{' '}
            <span className="text-muted-foreground">{value}</span>
          </p>
        );
      } else {
        elements.push(
          <p key={index} className="text-sm my-2 leading-relaxed text-muted-foreground">
            {cleanText}
          </p>
        );
      }
    }
  });

  flushList(lines.length);

  return <div className="space-y-1">{elements}</div>;
}
