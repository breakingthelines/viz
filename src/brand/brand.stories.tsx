import type { Meta, StoryObj } from '@storybook/react-vite';
import { BtlMark } from './mark';
import { ramp } from './colour';
import { ChartWatermark, PanelSignature, Wordmark } from './wordmark';

const meta = {
  title: 'Brand/Overview',
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mark: Story = {
  render: () => <BtlMark size={64} />,
};

export const WordmarkDefault: Story = {
  render: () => (
    <div style={{ background: '#151515', padding: 24 }}>
      <Wordmark height={36} markFill="#E20613" />
    </div>
  ),
};

export const Watermark: Story = {
  render: () => (
    <div style={{ background: '#151515', width: 480, height: 240, position: 'relative' }}>
      <ChartWatermark width={480} height={240} />
    </div>
  ),
};

export const Signature: Story = {
  render: () => (
    <div
      style={{ background: '#151515', padding: 16, display: 'flex', justifyContent: 'flex-end' }}
    >
      <PanelSignature />
    </div>
  ),
};

/** The percentile ramp from the muted base grey up to full strength at the 90th percentile. */
export const PercentileRamp: Story = {
  render: () => {
    const steps = Array.from({ length: 21 }, (_, i) => i * 5);
    return (
      <div
        style={{
          background: '#151515',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex' }}>
          {steps.map((p) => (
            <div key={p} style={{ width: 20, height: 28, background: ramp(p, 'subject') }} />
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          {steps.map((p) => (
            <div key={p} style={{ width: 20, height: 28, background: ramp(p, 'comparison') }} />
          ))}
        </div>
      </div>
    );
  },
};
