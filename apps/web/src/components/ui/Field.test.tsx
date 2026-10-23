import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CheckboxField, FieldGroup, SelectField, TextAreaField, TextField } from './Field';

describe('TextField', () => {
  it('connects the label to the input', async () => {
    render(<TextField label="Email" />);
    const input = screen.getByLabelText('Email');
    await userEvent.type(input, 'name@example.com');
    expect(input).toHaveValue('name@example.com');
  });

  it('reads out the hint with the field', () => {
    render(<TextField label="Email" hint="We only use this to reply." />);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'We only use this to reply.',
    );
  });

  it('marks the field invalid and reads out the error', () => {
    render(<TextField label="Email" hint="Work email" error="Enter a valid email address" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Work email Enter a valid email address');
    expect(screen.getByText('Enter a valid email address')).toBeVisible();
  });

  it('is not marked invalid without an error', () => {
    render(<TextField label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });

  it('marks required fields for screen readers without browser pop-ups', () => {
    render(<TextField label="Name" required />);
    const input = screen.getByLabelText(/Name/);
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('required');
  });
});

describe('other fields', () => {
  it('label the text area, select and checkbox', async () => {
    render(
      <>
        <TextAreaField label="Project details" />
        <SelectField label="Website type" defaultValue="business">
          <option value="business">Business</option>
          <option value="portfolio">Portfolio</option>
        </SelectField>
        <CheckboxField label="I agree" error="Tick this box to continue" />
      </>,
    );

    expect(screen.getByLabelText('Project details').tagName).toBe('TEXTAREA');
    await userEvent.selectOptions(screen.getByLabelText('Website type'), 'portfolio');
    expect(screen.getByLabelText('Website type')).toHaveValue('portfolio');

    const checkbox = screen.getByLabelText('I agree');
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAccessibleDescription('Tick this box to continue');
  });
});

describe('FieldGroup', () => {
  it('names the group for screen readers and reads out its hint', () => {
    render(
      <FieldGroup legend="Features" hint="Tick anything that applies.">
        <CheckboxField label="Gallery" value="gallery" />
        <CheckboxField label="Blog" value="blog" />
      </FieldGroup>,
    );
    const group = screen.getByRole('group', { name: 'Features' });
    expect(group).toHaveAccessibleDescription('Tick anything that applies.');
    expect(within(group).getAllByRole('checkbox')).toHaveLength(2);
  });

  it('works without a hint', () => {
    render(
      <FieldGroup legend="Features">
        <CheckboxField label="Gallery" />
      </FieldGroup>,
    );
    expect(screen.getByRole('group', { name: 'Features' })).not.toHaveAttribute('aria-describedby');
  });
});
