import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import type { RichTextBlockData, ProseMirrorNode } from '@/types';

interface Props {
  data: RichTextBlockData;
}

function renderNode(node: ProseMirrorNode, key: string | number): ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, i));

  switch (node.type) {
    case 'doc':
      return <>{children}</>;

    case 'paragraph':
      return (
        <p key={key} className="mb-4 last:mb-0">
          {children}
        </p>
      );

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2;
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      const sizeMap: Record<number, string> = {
        1: 'text-3xl font-bold mb-4',
        2: 'text-2xl font-semibold mb-3',
        3: 'text-xl font-semibold mb-2',
        4: 'text-lg font-medium mb-2',
        5: 'text-base font-medium mb-1',
        6: 'text-sm font-medium mb-1',
      };
      return (
        <Tag key={key} className={sizeMap[level] ?? 'text-xl font-semibold mb-2'}>
          {children}
        </Tag>
      );
    }

    case 'blockquote':
      return (
        <blockquote
          key={key}
          className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4"
        >
          {children}
        </blockquote>
      );

    case 'bulletList':
      return (
        <ul key={key} className="list-disc pl-6 mb-4 space-y-1">
          {children}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={key} className="list-decimal pl-6 mb-4 space-y-1">
          {children}
        </ol>
      );

    case 'listItem':
      return <li key={key}>{children}</li>;

    case 'hardBreak':
      return <br key={key} />;

    case 'text': {
      if (!node.text) return null;
      let el: React.ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        switch (mark.type) {
          case 'bold':
            el = <strong key={key}>{el}</strong>;
            break;
          case 'italic':
            el = <em key={key}>{el}</em>;
            break;
          case 'code':
            el = (
              <code
                key={key}
                className="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-sm font-mono"
              >
                {el}
              </code>
            );
            break;
          case 'link': {
            const href = (mark.attrs?.href as string) ?? '#';
            el = (
              <a
                key={key}
                href={href}
                className="text-blue-600 underline hover:text-blue-800"
              >
                {el}
              </a>
            );
            break;
          }
        }
      }
      return el;
    }

    default:
      return null;
  }
}

export function RichTextBlock({ data }: Props) {
  const { content, textAlign = 'left', htmlFallback } = data;

  return (
    <section
      className={clsx(
        'w-full px-6 py-12 max-w-3xl mx-auto',
        textAlign === 'center' && 'text-center',
        textAlign === 'right' && 'text-right',
      )}
    >
      <div className="text-base leading-7 text-gray-700 space-y-4">
        {content?.content
          ? renderNode(content, 'root')
          : htmlFallback && (
              <div dangerouslySetInnerHTML={{ __html: htmlFallback }} />
            )}
      </div>
    </section>
  );
}
