import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders sparklenz dashboard", () => {
  render(<App />);
  const headingElement = screen.getByText(/agency os/i);
  expect(headingElement).toBeInTheDocument();
});
