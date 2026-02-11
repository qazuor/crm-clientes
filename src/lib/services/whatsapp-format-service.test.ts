import { describe, expect, it } from 'vitest';
import { htmlToWhatsApp } from './whatsapp-format-service';

describe('htmlToWhatsApp', () => {
  it('returns empty string for empty input', () => {
    expect(htmlToWhatsApp('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    expect(htmlToWhatsApp(null as unknown as string)).toBe('');
  });

  // Paragraph handling
  it('converts paragraphs to text with newlines', () => {
    expect(htmlToWhatsApp('<p>Hello</p><p>World</p>')).toBe('Hello\nWorld');
  });

  // Bold formatting
  it('converts <strong> to WhatsApp bold', () => {
    expect(htmlToWhatsApp('<p><strong>Bold text</strong></p>')).toBe('*Bold text*');
  });

  it('converts <b> to WhatsApp bold', () => {
    expect(htmlToWhatsApp('<p><b>Bold text</b></p>')).toBe('*Bold text*');
  });

  // Italic formatting
  it('converts <em> to WhatsApp italic', () => {
    expect(htmlToWhatsApp('<p><em>Italic text</em></p>')).toBe('_Italic text_');
  });

  it('converts <i> to WhatsApp italic', () => {
    expect(htmlToWhatsApp('<p><i>Italic text</i></p>')).toBe('_Italic text_');
  });

  // Strikethrough
  it('converts <s> to WhatsApp strikethrough', () => {
    expect(htmlToWhatsApp('<p><s>Deleted</s></p>')).toBe('~Deleted~');
  });

  // Code
  it('converts <code> to WhatsApp inline code', () => {
    expect(htmlToWhatsApp('<p><code>code here</code></p>')).toBe('`code here`');
  });

  // Links
  it('converts links to text with URL', () => {
    expect(htmlToWhatsApp('<p><a href="https://example.com">Click here</a></p>')).toBe('Click here (https://example.com)');
  });

  // Headings
  it('converts headings to bold text', () => {
    expect(htmlToWhatsApp('<h2>Title</h2>')).toBe('*Title*');
  });

  // Unordered lists
  it('converts unordered lists to bullet points', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
    const expected = '• Item 1\n• Item 2\n• Item 3';
    expect(htmlToWhatsApp(html)).toBe(expected);
  });

  // Ordered lists
  it('converts ordered lists to numbered items', () => {
    const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
    const expected = '1. First\n2. Second\n3. Third';
    expect(htmlToWhatsApp(html)).toBe(expected);
  });

  // Line breaks (standalone, outside <p> tags)
  it('converts standalone <br> to newlines', () => {
    expect(htmlToWhatsApp('Line 1<br>Line 2')).toBe('Line 1\nLine 2');
  });

  // HTML entity decoding
  it('decodes HTML entities', () => {
    expect(htmlToWhatsApp('<p>&amp; &lt; &gt; &quot; &#39; &nbsp;</p>')).toBe("& < > \" '");
  });

  // Multiple newlines collapse
  it('collapses multiple newlines to maximum 2', () => {
    const html = '<p>A</p><p></p><p></p><p></p><p>B</p>';
    const result = htmlToWhatsApp(html);
    expect(result).not.toContain('\n\n\n');
  });

  // Complex content
  it('handles mixed formatting in a paragraph', () => {
    const html = '<p>This is <strong>bold</strong> and <em>italic</em> text</p>';
    expect(htmlToWhatsApp(html)).toBe('This is *bold* and _italic_ text');
  });

  // Strips remaining HTML tags
  it('strips unknown HTML tags', () => {
    const html = '<p>Text with <span class="special">span</span> content</p>';
    expect(htmlToWhatsApp(html)).toBe('Text with span content');
  });
});
