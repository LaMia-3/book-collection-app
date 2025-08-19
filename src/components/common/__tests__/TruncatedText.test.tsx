import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TruncatedText } from '../TruncatedText';
import '@testing-library/jest-dom';

describe('TruncatedText Component', () => {
  it('renders text without truncation when under maxLength', () => {
    const shortText = 'Short text';
    render(<TruncatedText text={shortText} maxLength={20} />);
    
    const textElement = screen.getByText(shortText);
    expect(textElement).toBeInTheDocument();
    expect(textElement.textContent).toBe(shortText);
  });

  it('truncates text when over maxLength', () => {
    const longText = 'This is a very long text that should be truncated';
    const maxLength = 20;
    
    render(<TruncatedText text={longText} maxLength={maxLength} />);
    
    // Should show truncated text with ellipsis
    expect(screen.getByText(`${longText.slice(0, maxLength)}...`)).toBeInTheDocument();
  });

  it('applies lineClamp correctly', () => {
    const longText = 'This is a long text that should be displayed with line clamping';
    render(<TruncatedText text={longText} lineClamp={2} />);
    
    const textElement = screen.getByText(longText);
    expect(textElement).toBeInTheDocument();
    expect(textElement.className).toContain('line-clamp-2');
  });

  it('does not show tooltip when tooltipDisabled is true', () => {
    const longText = 'This is a very long text that should be truncated but without tooltip';
    
    render(<TruncatedText text={longText} maxLength={20} tooltipDisabled={true} />);
    
    // Ensure the text is there
    const textElement = screen.getByText(/This is a very long/);
    expect(textElement).toBeInTheDocument();
    
    // Tooltip trigger should not be rendered
    expect(textElement.getAttribute('aria-label')).toBeNull();
  });

  it('adds custom className when provided', () => {
    const text = 'Test text';
    const customClass = 'custom-class';
    
    render(<TruncatedText text={text} className={customClass} />);
    
    const textElement = screen.getByText(text);
    expect(textElement.className).toContain(customClass);
  });

  it('handles empty text gracefully', () => {
    const { container } = render(<TruncatedText text="" />);
    // Instead of using getByText with an empty string, check that the component renders
    // and doesn't throw an error
    expect(container).toBeInTheDocument();
  });
});
