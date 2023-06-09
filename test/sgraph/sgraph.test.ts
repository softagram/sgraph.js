import { SElement, SElementAssociation, SGraph } from '../../src';

const getExpectedXml = (associationAttributes: string) => `<model version="2.1">
<elements>
    <e  n="child1"  >
    <r r="2,3" ${associationAttributes}/>
      <e  n="secondLevelChild"  >
        <e  n="thirdLevelChild"  t="repository"
           test="value" >
        </e>
      </e>
    </e>
    <e  i="2"  n="child2"  >
    </e>
    <e  i="3"  n="child3"  >
    </e>
</elements>
</model>
`;
describe('sgraph tests', () => {
  it('should give out correct xml from graph', () => {
    const graph = getSgraphWithAssociation();
    expect(graph.toXml()).toBe(getExpectedXml(' '));
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

  it('should print correct association type and attrubutes', () => {
    const graph1 = getSgraphWithAssociation('rest_api');
    expect(graph1.toXml()).toBe(getExpectedXml(' t="rest_api"\n       '));
    const graph2 = getSgraphWithAssociation('rest_api', {
      attribute1: 'attributeValue1',
      attribute2: 'attributeValue2',
    });
    expect(graph2.toXml()).toBe(
      getExpectedXml(
        ' t="rest_api"\n       attribute1="attributeValue1" attribute2="attributeValue2"'
      )
    );
  });
});

const getSgraphWithAssociation = (
  associationType?: string | undefined,
  associationAttributes?: Record<string, string> | undefined
) => {
  const element = new SElement('test');
  element.setAttributes({ attribute1: 'value1', attribute2: 'value2' });
  const childElement1 = new SElement('child1');
  const childElement2 = new SElement('child2');
  const childElement3 = new SElement('child3');
  const secondLevelChild = new SElement('secondLevelChild');
  childElement1.addChild(secondLevelChild);
  element.addChild(childElement1);
  element.addChild(childElement2);
  element.addChild(childElement3);
  const thirdLevelChild = new SElement('thirdLevelChild');
  thirdLevelChild.addAttribute('test', 'value');
  thirdLevelChild.addAttribute('type', 'repository');
  secondLevelChild.addChild(thirdLevelChild);
  SElementAssociation.createUniqueElementAssociation(
    childElement1,
    childElement2,
    associationType,
    associationAttributes
  );
  SElementAssociation.createUniqueElementAssociation(
    childElement1,
    childElement3,
    associationType,
    associationAttributes
  );
  const graph = new SGraph(element);
  return graph;
};
