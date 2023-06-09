import { SElement, SElementAssociation } from '../../src';
import {
  getAttributeString,
  groupElementAssociations,
} from '../../src/utils/sgraph-utils';
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

  it('should group element associations based on type', () => {
    const element1 = new SElement('element1');
    const element2 = new SElement('element2');
    const element3 = new SElement('element3');
    const element4 = new SElement('element4');
    const { existingOrNewAssociation: association1 } =
      SElementAssociation.createUniqueElementAssociation(
        element1,
        element2,
        'rest_api'
      );
    const { existingOrNewAssociation: association2 } =
      SElementAssociation.createUniqueElementAssociation(
        element1,
        element3,
        'rest_api'
      );
    const { existingOrNewAssociation: association3 } =
      SElementAssociation.createUniqueElementAssociation(
        element1,
        element4,
        'rest_api'
      );
    const { existingOrNewAssociation: association4 } =
      SElementAssociation.createUniqueElementAssociation(
        element1,
        element4,
        'import'
      );
    const groups = groupElementAssociations([
      association1,
      association2,
      association3,
      association4,
    ]);
    expect(groups[0].associationlist.length).toBe(3);
    expect(groups[0].deptype).toBe('rest_api');
    expect(groups[0].attrs).toEqual({});
    expect(groups[1].associationlist.length).toBe(1);
    expect(groups[1].deptype).toBe('import');
    expect(groups[1].attrs).toEqual({});
  });
});
