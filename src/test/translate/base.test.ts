import { BaseTranslator } from '../../translator';

const texts = [
  '@:(common.get)@:(scoreCenter.ruleSetting)@:(common.list)',
  '@:(common.add)@:(scoreCenter.ruleSetting)',
  '@:(common.edit)@:(scoreCenter.ruleSetting)',
  '@:(common.delete)@:(scoreCenter.ruleSetting)',
  '检查保存积分规则条件',
  '@:(common.get)@:(scoreCenter.ruleSetting)@:(common.detail)',
  '@:(common.get)@:(scoreCenter.eventKey)@:(common.list)',
  '@:(common.get)@:(scoreCenter.scoreSetting)',
  '@:(common.add)@:(scoreCenter.scoreSetting)',
  '@:(common.edit)@:(scoreCenter.scoreSetting)',
  '@:(scoreCenter.menualexec)积分过期',
  '@:(common.get)@:(scoreCenter.scoreRatio)@:(common.list)',
  '@:(common.get)@:(scoreCenter.scoreRatio)@:(common.detail)',
  '@:(scoreCenter.newMulAct)',
  '@:(scoreCenter.editMulAct)',
  '@:(common.terminate)@:(scoreCenter.mulAct)',
  '@:(common.get)会员积分统计信息',
  '@:(common.get)会员积分@:(common.list)',
  '{ xxx.asd. }会员积分统计信息',
  "$t('asd')会员{ xxx.0.12.xxx }会员@:(scoreCenter.scoreRatio)",
  "\\$t('asd')会员\\{ xxx.0.12.xxx }会员\\@:(scoreCenter.scoreRatio)",
  '{ xxx.0.12.xxx }会员@:(scoreCenter.scoreRatio)积@:(common.terminate)信息',
  '{ xxx.0.12.xxx }会员@:(scoreCenter.scoreRatio)积$t(NNN)信息',
  '@:(scoreCenter.scoreRatio){ xxx.0.12.xxx }会员积$t(NNN)信息',
  '{ xxx.0.12.xxx }会员@:(scoreCenter.scoreRatio积$t(NNN)信息',
];
const replaceTexts = [
  '$$0$$1$$2',
  '$$0$$1',
  '$$0$$1',
  '$$0$$1',
  '检查保存积分规则条件',
  '$$0$$1$$2',
  '$$0$$1$$2',
  '$$0$$1',
  '$$0$$1',
  '$$0$$1',
  '$$0积分过期',
  '$$0$$1$$2',
  '$$0$$1$$2',
  '$$0',
  '$$0',
  '$$0$$1',
  '$$0会员积分统计信息',
  '$$0会员积分$$1',
  '{ xxx.asd. }会员积分统计信息',
  "$t('asd')会员$$0会员$$1",
  "\\$t('asd')会员\\{ xxx.0.12.xxx }会员\\@:(scoreCenter.scoreRatio)",
  '$$0会员$$1积$$2信息',
  '$$0会员$$1积$$2信息',
  '$$0$$1会员积$$2信息',
  '$$0会员@:(scoreCenter.scoreRatio积$$1信息',
];
class TestTranslator extends BaseTranslator {
  replace(key: string, text: string): string {
    return super.replaceInterpolation(key, text);
  }
  reduction(key: string, text: string): string {
    return super.reductionInterpolation(key, text);
  }
}
const testTranslator = new TestTranslator();

describe('BaseTranslator', () => {
  test('插值替换测试', () => {
    texts.forEach((text, i) => {
      expect(testTranslator.replace(i as any, text!)).toBe(replaceTexts[i]);
    });
    replaceTexts.forEach((text, i) => {
      expect(testTranslator.reduction(i as any, text!)).toBe(texts[i]);
    });
  });

  test('c端组件插值替换测试', () => {
    const texts = [
      [
        '如谷之歌，<NiMI>。与风共存，< SSN >与种子越冬，与鸟歌颂。<89>',
        '如谷之歌，$$0。与风共存，$$1与种子越冬，与鸟歌颂。$$2',
      ],
      ['快看，< WWWW1 >就像垃圾一样。<HHHH>', '快看，$$0就像垃圾一样。$$1'],
      ['\\<SS>刚才还在担心<>，<ni)>你不会是天使吧\\ <T>', '\\<SS>刚才还在担心<>，<ni)>你不会是天使吧\\ $$0'],
    ];

    texts.forEach(([a, b], i) => {
      expect(testTranslator.replace(i as any, a)).toBe(b);
      expect(testTranslator.reduction(i as any, b)).toBe(a);
    });
  });

  test('时间插值替换测试', () => {
    const texts = [
      ['{xxx}', '$$0'],
      ['{xxx, localizedDatetime}', '$$0'],
      ['{xxx, localizedDatetime(format: LLL)}', '$$0'],
      ['{xxx, localizedDatetime(format: YYYY年M月D日dddd HH:mm)}', '$$0'],
      ['{xxx.xx, localizedDatetime(format: YYYY年M月D日dddd HH:mm)}SSS', '$$0SSS'],
      ['{ xxx }', '$$0'],
      ['{ xxx, localizedDatetime }', '$$0'],
      ['{ xxx, localizedDatetime() }', '$$0'],
      ['{ xxx, localizedDatetime(   )}', '$$0'],
      ['{ xxx,localizedDatetime(format: LLL)}', '$$0'],
      ['{  xxx,localizedDatetime(format: YYYY年M月D日dddd HH:mm)   }', '$$0'],
      ['{xxx.xx, localizedDatetime(  format  :    YYYY年M月D日dddd HH:mm    )}SSS', '$$0SSS'],
    ];

    texts.forEach(([a, b], i) => {
      expect(testTranslator.replace(i as any, a)).toBe(b);
      expect(testTranslator.reduction(i as any, b)).toBe(a);
    });
  });
});
