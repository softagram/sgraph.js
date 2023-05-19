import { SElement } from '../../src';
import { getAttributeString } from '../../src/utils/sgraph-utils';
describe('sgraph utils tests', () => {
  it('should give out correct attribute string', () => {
    const element = new SElement('test');
    element.setAttributes({ attribute1: 'value1', attribute2: 'value2' });
    const expectedString = `\n     attribute1=\"value1\" attribute2=\"value2\"`;
    expect(
      getAttributeString(element.getAttributes(), element.getType(), '  ')
    ).toBe(expectedString);
  });

  it('should sort attributes alphabetically', () => {
    const element = new SElement('test');
    element.setAttributes({
      b: 'value1',
      a: 'value2',
      d: 'value3',
      c: 'value4',
    });
    const expectedString = `\n     a=\"value2\" b=\"value1\" c=\"value4\" d=\"value3\"`;
    expect(
      getAttributeString(element.getAttributes(), element.getType(), '  ')
    ).toBe(expectedString);
  });
});
