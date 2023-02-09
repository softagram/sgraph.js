import { FilterAssociations, ModelApi, ModelLoader, SGraph } from '../src';
describe('ModelApi tests', () => {
  let model: SGraph;
  let modelApi: ModelApi;
  const CORE_PATH = '/nginx/src/core/';
  const NGINXC_PATH = `${CORE_PATH}nginx.c`;
  const NGINXH_PATH = `${CORE_PATH}nginx.h`;
  beforeEach(async () => {
    const loadedModel = await new ModelLoader().load('test/nginx_model.xml');
    if (loadedModel) {
      model = loadedModel;
      modelApi = new ModelApi({
        model,
      });
    } else {
      fail('Can not load model!');
    }
  });
  it('preserves attributes in model filtering', () => {
    const element = model.createOrGetElementFromPath(
      '/used-directly-from-nginx'
    );
    const subgraph = modelApi.filterModel(
      element,
      model,
      FilterAssociations.Ignore,
      FilterAssociations.Ignore
    );
    // Check that attributes are preserved in the subgraph
    const attributesOfNginxC =
      subgraph.rootNode.children[0].children[0].children[0].getAttributes();
    expect(attributesOfNginxC['someattribute'][0]).toBe('foo');
  });
  it('ignores outgoing dependencies if filter setting is ignore', async () => {
    // If Ignore mode is set for outgoing dependencies, subgraph should not include nginx.c -> nginx.h
    assertChildrenOfCoreAndReturnSubgraph(
      modelApi,
      NGINXC_PATH,
      model,
      FilterAssociations.Ignore,
      FilterAssociations.Ignore,
      1
    );
  });
  it('includes direct outgoing dependencies if filter setting is direct', async () => {
    // If Direct mode is set for outgoing dependencies, subgraph should include
    // nginx.c -> nginx.h
    // nginx.c -> used-directly-from-nginx
    const subgraph = assertChildrenOfCoreAndReturnSubgraph(
      modelApi,
      NGINXC_PATH,
      model,
      FilterAssociations.Direct,
      FilterAssociations.Ignore,
      2
    );
    assertUsedDirectlyIsInSubgraph(subgraph);
  });
  it('includes the whole chain of outgoing dependencies if filter setting is direct and indirect', async () => {
    // Subgraph should include
    // nginx.c -> nginx.h
    // nginx.c -> used-directly-from-nginx -> used-indirectly-from-nginx chain

    const subgraph = assertChildrenOfCoreAndReturnSubgraph(
      modelApi,
      NGINXC_PATH,
      model,
      FilterAssociations.DirectAndIndirect,
      FilterAssociations.Ignore,
      2
    );
    assertUsedDirectlyIsInSubgraph(subgraph);

    // Check that used-indirectly-from-nginx is included in subgraph
    const usedIndirectlyElement =
      subgraph.rootNode.children[2].children[0].children[0];
    expect(usedIndirectlyElement.name).toBe('used-indirectly-from-nginx.c');
  });
  it('includes direct incoming dependencies if filter setting is direct', async () => {
    // Subgraph should include
    // nginx.c -> nginx.h
    const subgraph = assertChildrenOfCoreAndReturnSubgraph(
      modelApi,
      NGINXH_PATH,
      model,
      FilterAssociations.Ignore,
      FilterAssociations.Direct,
      2,
      ['nginx.h', 'nginx.c']
    );

    // Check that root has only one child (nginx)
    expect(subgraph.rootNode.children.length).toBe(1);
    const nginxElement = subgraph.rootNode.children[0];
    expect(nginxElement.name).toBe('nginx');
  });
  it('includes the whole chain of incoming dependencies if filter setting is direct and indirect', async () => {
    // Subgraph should include
    // uses-nginx.c-file -> nginx.c -> nginx.h
    const subgraph = assertChildrenOfCoreAndReturnSubgraph(
      modelApi,
      NGINXH_PATH,
      model,
      FilterAssociations.Ignore,
      FilterAssociations.DirectAndIndirect,
      2,
      ['nginx.h', 'nginx.c']
    );

    // Check that root has two children (nginx and directory-that-depends-on-nginx.c)
    expect(subgraph.rootNode.children.length).toBe(2);
    const nginxElement = subgraph.rootNode.children[0];
    expect(nginxElement.name).toBe('nginx');
    const directoryThatDependsOnNginxC = subgraph.rootNode.children[1];
    expect(directoryThatDependsOnNginxC.name).toBe(
      'directory-that-depends-on-nginx.c'
    );
  });
  it('does not add the same association twice in filter model', async () => {
    const subgraph = assertChildrenOfCoreAndReturnSubgraph(
      modelApi,
      NGINXC_PATH,
      model,
      FilterAssociations.DirectAndIndirect,
      FilterAssociations.DirectAndIndirect,
      2,
      ['nginx.c', 'nginx.h']
    );
    // Check that nginx.c has only one incoming dependency
    expect(
      subgraph.rootNode.children[0].children[0].children[0].children[0].incoming
        .length
    ).toBe(1);
  });
  it('adds association with different type twice', async () => {
    const element = model.createOrGetElementFromPath('/foo/bar/test/test1');
    const subgraph = modelApi.filterModel(
      element,
      model,
      FilterAssociations.DirectAndIndirect,
      FilterAssociations.DirectAndIndirect
    );
    // Check that test1 has two incoming dependencies whose type is different
    const incomingDependenciesOfTest1 =
      subgraph.rootNode.children[0].children[0].children[0].children[0]
        .incoming;
    expect(incomingDependenciesOfTest1.length).toBe(2);
    expect(incomingDependenciesOfTest1[0].deptype).toBe('inc1');
    expect(incomingDependenciesOfTest1[1].deptype).toBe('inc2');
  });
});
function assertUsedDirectlyIsInSubgraph(subgraph: SGraph) {
  const usedDirectlyElement =
    subgraph.rootNode.children[1].children[0].children[0];
  expect(usedDirectlyElement.name).toBe('used-directly-from-nginx.c');
}

function assertChildrenOfCoreAndReturnSubgraph(
  modelApi: ModelApi,
  elementPath: string,
  model: SGraph,
  filterSettingOutgoing: FilterAssociations,
  filterSettingIncoming: FilterAssociations,
  childrenLength: number,
  childrenNames: string[] = ['nginx.c', 'nginx.h']
) {
  const element = model.createOrGetElementFromPath(elementPath);
  const subgraph = modelApi.filterModel(
    element,
    model,
    filterSettingOutgoing,
    filterSettingIncoming
  );
  // Check the children of core
  const coreElement = subgraph.rootNode.children[0].children[0].children[0];
  expect(coreElement.children.length).toBe(childrenLength);

  for (let index = 0; index < childrenLength; index++) {
    expect(coreElement.children[index].name).toBe(childrenNames[index]);
  }
  return subgraph;
}
