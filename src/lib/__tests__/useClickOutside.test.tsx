import { render, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { useClickOutside } from "@/lib/useClickOutside";

function TestHarness({
  onOutsideClick,
  enabled = true,
}: {
  onOutsideClick: () => void;
  enabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onOutsideClick, enabled);
  return (
    <div>
      <div ref={ref} data-testid="inside">
        Inside
      </div>
      <div data-testid="outside">Outside</div>
    </div>
  );
}

describe("useClickOutside", () => {
  it("calls the callback when a mousedown occurs outside the ref'd element", () => {
    const onOutsideClick = jest.fn();
    const { getByTestId } = render(
      <TestHarness onOutsideClick={onOutsideClick} />,
    );
    fireEvent.mouseDown(getByTestId("outside"));
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  it("does not call the callback when a mousedown occurs inside the ref'd element", () => {
    const onOutsideClick = jest.fn();
    const { getByTestId } = render(
      <TestHarness onOutsideClick={onOutsideClick} />,
    );
    fireEvent.mouseDown(getByTestId("inside"));
    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  it("does not attach a listener (no callback firing) when enabled=false", () => {
    const onOutsideClick = jest.fn();
    const { getByTestId } = render(
      <TestHarness onOutsideClick={onOutsideClick} enabled={false} />,
    );
    fireEvent.mouseDown(getByTestId("outside"));
    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  it("removes its listener on unmount", () => {
    const onOutsideClick = jest.fn();
    const { getByTestId, unmount } = render(
      <TestHarness onOutsideClick={onOutsideClick} />,
    );
    const outside = getByTestId("outside");
    unmount();
    fireEvent.mouseDown(outside);
    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  it("always calls the latest callback without re-subscribing on every render", () => {
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();
    const { getByTestId, rerender } = render(
      <TestHarness onOutsideClick={firstCallback} />,
    );

    // Re-render with a brand-new inline callback (as real usage typically
    // does) — the hook should still call the *latest* one, not the first.
    rerender(<TestHarness onOutsideClick={secondCallback} />);

    fireEvent.mouseDown(getByTestId("outside"));
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });
});
