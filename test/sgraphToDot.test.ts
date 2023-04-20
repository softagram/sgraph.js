import { ModelApi, ModelLoader, sgraphToDot } from '../src';

const expectedDot = `digraph G {
  subgraph "cluster27c58af30adb13d2477ca23c8915ba8afb6446b5" {
    subgraph "cluster24f1a930ce2777fc25de57715b0e0453a315278d" {
      subgraph "cluster4e430d9b0a84cdaf5dd778d0307189502db16369" {
        "c1007d8798b3ff76d92e126def0f890329db5884" [label=".gitignore"];
        subgraph "clusterd89a3095f6d080df07fe6d61dfb11c82fa5a5724" {
          "5041c6f9a5895b3e49d0232bb4d25b258a763eaf" [label="first"];
          "f223dae5729e4a16238fefc57079b3be083988ff" [label="firstdep"];
          label = "first.py";
        }
        "c1ffc1e928008e0d84a6640e8e16b4359387810f" [label="main.py"];
        subgraph "cluster69c243ccd51fe4a241cad8b102f8c05cec0a4af4" {
          "1c805310968af27bc31604e3e7a1a790dee27595" [label="second"];
          "f3d8c02b608083c4e63ef1a06828ba3797b63a83" [label="seconddep"];
          label = "second.py";
        }
        subgraph "cluster0d7a1ac2f0e8d12cce095dff2571f80e9128e2c5" {
          "3ca029734fa3b92a347f010faffd0919a745af6c" [label="thirddep"];
          label = "third.py";
        }
        label = "cyclic-dep-test";
      }
      label = "cyclic";
    }
  }

  "c1ffc1e928008e0d84a6640e8e16b4359387810f" -> "5041c6f9a5895b3e49d0232bb4d25b258a763eaf" [label="import"];
  "c1ffc1e928008e0d84a6640e8e16b4359387810f" -> "1c805310968af27bc31604e3e7a1a790dee27595" [label="import"];
}`;

describe('sgraphToDot', () => {
  it('should convert a graph to dot', async () => {
    const modelloader = new ModelLoader();
    const model = await modelloader.load('test/cyclic_model.xml');
    expect(model).toBeDefined();
    const modelApi = new ModelApi({ model: model! });

    const dot = sgraphToDot(modelApi.egm).replace(/\t/g, '  ');

    expect(dot).toEqual(expectedDot);
  });
});
