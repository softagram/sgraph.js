import { SElement } from '../../src/selement';
describe('selement tests', () => {
  it('selement getChildByName should return undefined if child is not defined', () => {
    const element = new SElement('test', undefined);
    expect(element.getChildByName('valueOf')).toBeUndefined();
    expect(element.getChildByName('toString')).toBeUndefined();
  });
  it('selement getChildByName should return correct child', () => {
    const element = new SElement('test', undefined);
    const child = new SElement('child', element);
    const anotherChild = new SElement('anotherchild', element);
    expect(element.getChildByName('child')).toEqual(child);
    expect(element.getChildByName('anotherchild')).toEqual(anotherChild);
  });
});
