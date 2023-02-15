import { ModelApi, ModelLoader } from '../src';

describe('Cyclic', () => {
  it('should find cyclic dependencies', async () => {
    const modelloader = new ModelLoader();
    const model = await modelloader.load('test/cyclic_model.xml');
    expect(model).toBeDefined();
    const modelApi = new ModelApi({ model: model! });
    const firstPy = modelApi.getElementsByName('first.py')?.[0];
    expect(firstPy).toBeDefined();
    const cyclicDeps = firstPy.getCyclicDependencies();
    expect(cyclicDeps.length).toBe(2);
    expect(cyclicDeps.find((c) => c.length === 2)?.map((e) => e.name)).toEqual([
      'first.py',
      'second.py',
    ]);
    expect(cyclicDeps.find((c) => c.length === 3)?.map((e) => e.name)).toEqual([
      'first.py',
      'second.py',
      'third.py',
    ]);
  });
});
