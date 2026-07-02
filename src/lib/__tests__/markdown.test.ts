import { renderMarkdown } from "@/lib/markdown";

// ---------------------------------------------------------------------------
// Basic markdown rendering
// ---------------------------------------------------------------------------

describe("renderMarkdown – basic formatting", () => {
  it("renders bold text as <strong>", () => {
    const html = renderMarkdown("**important**");
    expect(html).toContain("<strong>important</strong>");
  });

  it("renders italic text as <em>", () => {
    const html = renderMarkdown("*note*");
    expect(html).toContain("<em>note</em>");
  });

  it("renders inline code as <code>", () => {
    const html = renderMarkdown("`inline`");
    expect(html).toContain("<code>inline</code>");
  });

  it("renders a fenced code block", () => {
    const html = renderMarkdown("```\nconst x = 1;\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("const x = 1;");
  });

  it("renders unordered lists", () => {
    const html = renderMarkdown("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
  });

  it("renders headings", () => {
    const html = renderMarkdown("## Heading");
    expect(html).toContain("<h2>Heading</h2>");
  });

  it("converts single newlines to <br> (breaks: true)", () => {
    const html = renderMarkdown("line one\nline two");
    expect(html).toContain("<br>");
  });

  it("leaves plain text without markdown syntax readable", () => {
    const html = renderMarkdown("just plain text");
    expect(html).toContain("just plain text");
  });

  it("does not crash on incomplete/unclosed markdown syntax (mid-stream)", () => {
    expect(() => renderMarkdown("**unclosed bold and `unclosed code")).not.toThrow();
  });

  it("does not crash on empty content", () => {
    expect(() => renderMarkdown("")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

describe("renderMarkdown – links", () => {
  it("renders a markdown link as <a href>", () => {
    const html = renderMarkdown("[click here](https://example.com)");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("click here");
  });

  it("forces target=_blank on links", () => {
    const html = renderMarkdown("[link](https://example.com)");
    expect(html).toContain('target="_blank"');
  });

  it("forces rel=noopener noreferrer on links", () => {
    const html = renderMarkdown("[link](https://example.com)");
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("neutralizes javascript: URIs", () => {
    const html = renderMarkdown("[click me](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  // Regression: DOMPurify strips a dangerous href (javascript:, data:, etc.)
  // before this module's afterSanitizeAttributes hook runs. The hook used
  // to unconditionally add target="_blank" to every <a>, which dressed up
  // the now-hrefless anchor as if it were a normal clickable link — visually
  // link-styled but inert when clicked.
  it("does not add target/rel to a link whose href was stripped as dangerous", () => {
    const html = renderMarkdown("[click me](javascript:alert(1))");
    expect(html).not.toContain("target=");
    expect(html).not.toContain("rel=");
    // The link text itself should still render as plain content.
    expect(html).toContain("click me");
  });

  it("does not add target/rel to a link with a stripped data: URI", () => {
    const html = renderMarkdown("[click me](data:text/html,<script>alert(1)</script>)");
    expect(html).not.toContain("target=");
    expect(html).not.toContain("rel=");
  });
});

// ---------------------------------------------------------------------------
// XSS sanitization — the reason this module exists
// ---------------------------------------------------------------------------

describe("renderMarkdown – sanitization", () => {
  it("strips <script> tags entirely", () => {
    const html = renderMarkdown("<script>alert('xss')</script>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(");
  });

  it("strips onerror/onclick and other event-handler attributes", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("strips <iframe> tags", () => {
    const html = renderMarkdown('<iframe src="https://evil.example"></iframe>');
    expect(html).not.toContain("<iframe");
  });

  it("strips <style> tags", () => {
    const html = renderMarkdown("<style>body{display:none}</style>");
    expect(html).not.toContain("<style");
  });

  it("strips raw <img> tags entirely (not in the allow-list)", () => {
    const html = renderMarkdown('<img src="https://example.com/x.png">');
    expect(html).not.toContain("<img");
  });

  it("keeps the surrounding safe text after stripping a malicious tag", () => {
    const html = renderMarkdown("before <script>alert(1)</script> after");
    expect(html).toContain("before");
    expect(html).toContain("after");
  });

  it("strips SVG-based XSS vectors", () => {
    const html = renderMarkdown(
      '<svg onload="alert(1)"><animate attributeName="x"></svg>',
    );
    expect(html).not.toContain("onload");
    expect(html).not.toContain("<svg");
  });
});
