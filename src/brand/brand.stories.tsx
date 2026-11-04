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
    <div style={{ background: '#151515', width: 480, height: 240 }}>
      <svg width={480} height={240} viewBox="0 0 480 240">
        <ChartWatermark cx={240} cy={120} />
      </svg>
    </div>
  ),
};

/**
 * Centred on the form chart's own plot area (`prof/page2.py:169`), at the
 * mock's fixed mark height of 56 — not scaled to the viewport, which is how
 * a 720x488 wheel or a 680x230 form chart previously overflowed.
 */
export const WatermarkFormChart: Story = {
  render: () => (
    <div style={{ background: '#151515', width: 680, height: 230 }}>
      <svg width={680} height={230} viewBox="0 0 680 230">
        <ChartWatermark cx={340} cy={102} />
      </svg>
    </div>
  ),
};

/** Centred on a 720x488 wheel-sized viewport, at the same fixed mark height. */
export const WatermarkWheel: Story = {
  render: () => (
    <div style={{ background: '#151515', width: 720, height: 488 }}>
      <svg width={720} height={488} viewBox="0 0 720 488">
        <ChartWatermark cx={360} cy={244} />
      </svg>
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
