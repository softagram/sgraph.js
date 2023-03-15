import { SElement, SElementAssociation } from '../../src/selement';
import { SGraph } from '../../src/sgraph';
describe('selement association tests', () => {
  it('should not create the same association twice', () => {
    const { element1, element2 } = createGraphAndElements();
    SElementAssociation.createUniqueElementAssociation(
      element1,
      element2,
      '',
      {}
    );
    expect(element1.outgoing.length).toBe(1);
    expect(element2.incoming.length).toBe(1);
    SElementAssociation.createUniqueElementAssociation(
      element1,
      element2,
      '',
      {}
    );
    expect(element1.outgoing.length).toBe(1);
    expect(element2.incoming.length).toBe(1);
  });
  it('should create the association twice if deptype is different', () => {
    const { element1, element2 } = createGraphAndElements();
    SElementAssociation.createUniqueElementAssociation(
      element1,
      element2,
      'deptype1',
      {}
    );
    expect(element1.outgoing.length).toBe(1);
    expect(element2.incoming.length).toBe(1);
    SElementAssociation.createUniqueElementAssociation(
      element1,
      element2,
      'deptype2',
      {}
    );
    expect(element1.outgoing.length).toBe(2);
    expect(element1.outgoing[0].deptype).toBe('deptype1');
    expect(element1.outgoing[1].deptype).toBe('deptype2');
    expect(element2.incoming.length).toBe(2);
    expect(element2.incoming[0].deptype).toBe('deptype1');
    expect(element2.incoming[1].deptype).toBe('deptype2');
  });
  it('should combine attributes of the associations', () => {
    const { element1, element2 } = createGraphAndElements();
    SElementAssociation.createUniqueElementAssociation(
      element1,
      element2,
      'deptype',
      { attribute1: 'value1' }
    );
    SElementAssociation.createUniqueElementAssociation(
      element1,
      element2,
      'deptype',
      { attribute2: 'value2' }
    );
    expect(element1.outgoing[0].getAttributes()).toEqual({
      attribute1: 'value1',
      attribute2: 'value2',
    });
  });
});

const createGraphAndElements = () => {
  const graph = new SGraph(new SElement('root', undefined));
  const element1 = graph.createOrGetElementFromPath('/test/element1');
  const element2 = graph.createOrGetElementFromPath('/test/element2');
  return { element1, element2 };
};
