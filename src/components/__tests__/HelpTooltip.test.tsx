import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpTooltip } from "@/components/HelpTooltip";

describe("HelpTooltip", () => {
  it("does not show the hint text until triggered", () => {
    render(<HelpTooltip text="Explains the step." />);
    expect(screen.queryByText("Explains the step.")).not.toBeInTheDocument();
  });

  it("renders the '?' affordance", () => {
    render(<HelpTooltip text="Explains the step." />);
    expect(
      screen.getByRole("button", { name: /what does this step do/i }),
    ).toBeInTheDocument();
  });

  it("shows the hint on hover (mouseEnter)", () => {
    render(<HelpTooltip text="Explains the step." />);
    const button = screen.getByRole("button", { name: /what does this step do/i });
    fireEvent.mouseEnter(button);
    expect(screen.getByText("Explains the step.")).toBeInTheDocument();
  });

  it("hides the hint when the mouse leaves", () => {
    render(<HelpTooltip text="Explains the step." />);
    const button = screen.getByRole("button", { name: /what does this step do/i });
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    expect(screen.queryByText("Explains the step.")).not.toBeInTheDocument();
  });

  it("opens the hint on click (for touch devices without hover)", async () => {
    const user = userEvent.setup();
    render(<HelpTooltip text="Explains the step." />);
    const button = screen.getByRole("button", { name: /what does this step do/i });

    await user.click(button);
    expect(screen.getByText("Explains the step.")).toBeInTheDocument();
  });

  // Regression: a real mouse click is always preceded by a hover (mouseenter
  // fires before click), so a naive click-to-toggle would immediately
  // re-close whatever hover just opened, making click effectively a no-op.
  it("does not close the hint on a second click (only click-outside closes it)", async () => {
    const user = userEvent.setup();
    render(<HelpTooltip text="Explains the step." />);
    const button = screen.getByRole("button", { name: /what does this step do/i });

    await user.click(button);
    await user.click(button);
    expect(screen.getByText("Explains the step.")).toBeInTheDocument();
  });

  // Regression: onMouseLeave used to unconditionally close the tooltip
  // regardless of how it was opened. Since a real mouse click is always
  // preceded by hovering, moving the mouse away right after a click used to
  // close it immediately — the click provided zero persistence benefit over
  // plain hover, defeating its whole purpose (letting the user click, then
  // move the mouse to read comfortably, without it vanishing).
  it("stays open when the mouse leaves after a click (click pins it open)", async () => {
    const user = userEvent.setup();
    render(<HelpTooltip text="Explains the step." />);
    const button = screen.getByRole("button", { name: /what does this step do/i });

    await user.click(button); // click opens it (mouse is hovering at this point)
    fireEvent.mouseLeave(button); // moving away afterward must not close it

    expect(screen.getByText("Explains the step.")).toBeInTheDocument();
  });

  it("still closes on mouse leave when opened purely by hover (no click)", () => {
    render(<HelpTooltip text="Explains the step." />);
    const button = screen.getByRole("button", { name: /what does this step do/i });

    fireEvent.mouseEnter(button);
    expect(screen.getByText("Explains the step.")).toBeInTheDocument();

    fireEvent.mouseLeave(button);
    expect(screen.queryByText("Explains the step.")).not.toBeInTheDocument();
  });

  it("closes a click-pinned tooltip via click-outside even after the mouse already left", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <HelpTooltip text="Explains the step." />
        <button type="button">Outside</button>
      </div>,
    );
    const helpButton = screen.getByRole("button", {
      name: /what does this step do/i,
    });

    await user.click(helpButton);
    fireEvent.mouseLeave(helpButton);
    expect(screen.getByText("Explains the step.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByText("Explains the step.")).not.toBeInTheDocument();
  });

  it("closes the hint when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <HelpTooltip text="Explains the step." />
        <button type="button">Outside</button>
      </div>,
    );
    const helpButton = screen.getByRole("button", {
      name: /what does this step do/i,
    });

    await user.click(helpButton);
    expect(screen.getByText("Explains the step.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByText("Explains the step.")).not.toBeInTheDocument();
  });

  it("stops the click from bubbling to an ancestor's onClick", async () => {
    const onAncestorClick = jest.fn();
    const user = userEvent.setup();
    render(
      <div onClick={onAncestorClick}>
        <HelpTooltip text="Explains the step." />
      </div>,
    );
    await user.click(
      screen.getByRole("button", { name: /what does this step do/i }),
    );
    expect(onAncestorClick).not.toHaveBeenCalled();
  });

  it("reflects open state via aria-expanded", async () => {
    const user = userEvent.setup();
    render(<HelpTooltip text="Explains the step." />);
    const button = screen.getByRole("button", { name: /what does this step do/i });

    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
