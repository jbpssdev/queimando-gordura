import { describe, expect, it, vi } from 'vitest';
import { PdfBuilder } from './pdf-builder.js';

describe('PDF layout regressions', () => {
  it('mantém o texto de avisos dentro da caixa, incluindo título multilinha', () => {
    const pdf = new PdfBuilder();
    const text = vi.spyOn(pdf, 'drawText');
    const rectangle = vi.spyOn(pdf, 'drawRect');
    pdf.drawCallout('Informações autodeclaradas e responsabilidade clínica '.repeat(3), [
      'Texto de contexto com acentuação. '.repeat(15),
    ]);
    const bottom = rectangle.mock.calls[0]![1];
    for (const call of text.mock.calls) expect(call[2]).toBeGreaterThan(bottom + 5);
  });
  it('quebra células extensas e repete cabeçalhos ao trocar de página sem cortar palavras longas', () => {
    const pdf = new PdfBuilder();
    const text = vi.spyOn(pdf, 'drawText');
    pdf.drawTable(
      ['Campo', 'Informação'],
      [
        ['Medicamento', 'IdentificadorExtenso'.repeat(150)],
        ...Array.from({ length: 30 }, () => ['Data real', '2026-10-31: 74.25 kg']),
      ],
      [180, 335.28],
    );
    expect(text.mock.calls.filter((c) => c[0] === 'Campo').length).toBeGreaterThan(1);
    for (const call of text.mock.calls) expect(call[2]).toBeGreaterThan(pdf.bottomMargin);
    expect(pdf.build().subarray(0, 8).toString()).toBe('%PDF-1.4');
  });
});
