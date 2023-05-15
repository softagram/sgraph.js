import { SElement, SElementAssociation, SGraph } from '../../src';

describe('sgraph tests', () => {
  it('should give out correct xml from graph', () => {
    const element = new SElement('test');
    element.setAttributes({ attribute1: 'value1', attribute2: 'value2' });
    const childElement1 = new SElement('child1');
    const childElement2 = new SElement('child2');
    const secondLevelChild = new SElement('secondLevelChild');
    childElement1.addChild(secondLevelChild);
    element.addChild(childElement1);
    element.addChild(childElement2);
    const thirdLevelChild = new SElement('thirdLevelChild');
    thirdLevelChild.addAttribute('test', 'value');
    thirdLevelChild.addAttribute('type', 'repository');
    secondLevelChild.addChild(thirdLevelChild);
    SElementAssociation.createUniqueElementAssociation(
      childElement1,
      childElement2
    );
    const graph = new SGraph(element);
    const expectedXml = `<model version="2.1">
<elements>
    <e  n="child1"  >
    <r r="2"  />
      <e  n="secondLevelChild"  >
        <e  n="thirdLevelChild"  t="repository"
           test="value" >
        </e>
      </e>
    </e>
    <e  i="2"  n="child2"  >
    </e>
</elements>
</model>
`;
    expect(graph.toXml()).toBe(expectedXml);
  });

  it('should handle invalidCharacters', () => {
    const invalid1 = '🐶🐶🐶'.substring(0, 5);
    const invalid2 = String.fromCharCode(0xd801);
    const element = new SElement('test');
    const childElement1 = new SElement(invalid1);
    const childElement2 = new SElement(invalid2);
    element.addChild(childElement1);
    element.addChild(childElement2);
    const graph = new SGraph(element);
    const expectedXml = `<model version="2.1">
<elements>
    <e  n="${invalid2}"  >
    </e>
    <e  n="${invalid1}"  >
    </e>
</elements>
</model>
`;
    expect(graph.toXml()).toBe(expectedXml);
  });

  it('should sort children alphabetically', () => {
    const element = new SElement('test');
    const childElement1 = new SElement('cChild');
    const childElement2 = new SElement('aChild');
    const secondLevelChild1 = new SElement('bSecondLevelChild');
    const secondLevelChild2 = new SElement('aSecondLevelChild');
    childElement1.addChild(secondLevelChild1);
    childElement1.addChild(secondLevelChild2);
    element.addChild(childElement1);
    element.addChild(childElement2);
    const graph = new SGraph(element);
    const expectedXml = `<model version="2.1">
<elements>
    <e  n="aChild"  >
    </e>
    <e  n="cChild"  >
      <e  n="aSecondLevelChild"  >
      </e>
      <e  n="bSecondLevelChild"  >
      </e>
    </e>
</elements>
</model>
`;
    expect(graph.toXml()).toBe(expectedXml);
  });
});