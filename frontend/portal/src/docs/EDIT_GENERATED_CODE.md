We are designing a LLM generated video platform in which LLM generate Remotion code. 
We do the just in time compilation and render the generated code in UI, it works

Now, we want to introduct the capabilitis to edit the generated animation. 
We have two options
1. Let use click on elements in the generated code and update the styles, text etc
2. Let user provide a prompt to change the animation

2nd options we will anyways do. Right now, we need to design a way, where I should allow user to editor any parts of the code. 

I have seen a company called hera which does this, I reverse enginned them, here is what they do:
1. Generate remotion code and then converting it into html with a id to each element
2. From UI, it creates a dotted border on on available elements in the view
3. and upon changing any styling. They are storing the edits like this

Eg. 

```
var Animation_2bada6bf_c62d_4386_a6f9_e83c03349d8b_1765094760481_exports = {};
  __export(Animation_2bada6bf_c62d_4386_a6f9_e83c03349d8b_1765094760481_exports, {
    default: () => Animation
  });
  function Animation() {
    const frame2 = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const totalFrames = (0, import_react90.useMemo)(
      () => Math.max(1, Math.round(DURATION_SECONDS * fps)),
      [fps]
    );
    const tGlobalRaw = frame2 / totalFrames;
    const tGlobal = clamp01Scale(tGlobalRaw);
    const outerPaddingX = width * 0.06;
    const centerY = height * 0.5;
    const leftCardWidth = width * 0.22;
    const leftCardHeight = height * 0.46;
    const sourceTileWidth = width * 0.12;
    const sourceTileHeight = height * 0.11;
    const centerNodeSize = height * 0.22;
    const stageTileWidth = width * 0.13;
    const stageTileHeight = height * 0.15;
    const stagesGap = width * 0.03;
    const leftCardX = outerPaddingX;
    const leftCardY = centerY - leftCardHeight * 0.5;
    const sourceStartX = leftCardX + leftCardWidth + width * 0.04;
    const firstSourceY = centerY - sourceTileHeight * 1.6;
    const sourceGapY = sourceTileHeight * 1.2;
    const centerX = width * 0.5;
    const centerYCircle = centerY;
    const stagesStartX = centerX + centerNodeSize * 0.9;
    const stagesY = centerYCircle - stageTileHeight * 0.5;
    const secToT = (sec) => clamp01Scale(sec / DURATION_SECONDS);
    const bgGradient = `radial-gradient(circle at 0% 0%, #e3f2fd 0%, #f3e5f5 30%, #ffffff 70%)`;
    const centerPulseStart = secToT(1.2);
    const centerPulseEnd = secToT(3.8);
    let centerScale = 1;
    if (tGlobalRaw >= centerPulseStart && tGlobalRaw <= centerPulseEnd) {
      const local = (tGlobalRaw - centerPulseStart) / (centerPulseEnd - centerPulseStart);
      const pulse = Math.sin(local * Math.PI * 2) * 0.08;
      centerScale = 1 + pulse;
    }
    const circleRingProgress = cubicInOut(
      clamp01Scale((tGlobalRaw - secToT(0.6)) / (secToT(1.4) - secToT(0.6)))
    );
    const sourceRevealStart = 0.2;
    const stageRevealStart = 2.3;
    const connectorDuration = 2.2;
    const centerToStageDuration = 2;
    return /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
      AbsoluteFill,
      {
        id: "__HERAROOT__",
        style: {
          background: bgGradient,
          fontFamily: "Noto Sans, system-ui, sans-serif",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)(
          "div",
          {
            id: "MainCanvas",
            style: {
              width,
              height,
              position: "relative"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)(
                "svg",
                {
                  width,
                  height,
                  style: {
                    position: "absolute",
                    left: 0,
     

 /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
                "div",
                {
                  id: "CenterNodeWrapper",
                  style: {
                    position: "absolute",
                    left: centerX - centerNodeSize * 0.5,
                    top: centerYCircle - centerNodeSize * 0.5,
                    width: centerNodeSize,
                    height: centerNodeSize,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime52.jsxs)(
                    "div",
                    {
                      style: {
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: "radial-gradient(circle at 30% 30%, #ffffff 0%, #f3e5f5 40%, #e3f2fd 80%)",
                        boxShadow: "0 22px 50px rgba(15,23,42,0.28)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        transform: `scale(${centerScale})`,
                        transformOrigin: "center center"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
                          "div",
                          {
                            style: {
                              position: "absolute",
                              inset: centerNodeSize * 0.06,
                              borderRadius: "50%",
                              border: `${centerNodeSize * 0.03}px solid rgba(124,77,255,${circleRingProgress})`,
                              borderTopColor: "rgba(124,77,255,1)"
                            }
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
                          "div",
                          {
                            style: {
                              position: "relative",
                              width: centerNodeSize * 0.58,
                              height: centerNodeSize * 0.58,
                              borderRadius: "50%",
                              backgroundColor: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 10px 30px rgba(15,23,42,0.25)"
                            },
                            children: /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(EyeIcon, { size: centerNodeSize * 0.55 })
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime52.jsx)(
                          "div",
                          {
                            id: "CenterNodeLabel",
                            style: {
                              position: "absolute",
                              bottom: -centerNodeSize * 0.32,
                              left: "50%",
                              transform: "translateX(-50%)",
                              fontSize: 22,
                              fontWeight: 700,
                              color: "#111827",
                              textAlign: "center",
                              whiteSpace: "nowrap"
                            },
                            children: "Test\xA0Reporting\xA0&\xA0Analytics"
                          }
                        )
                      ]
                    }
                  )
                }
              ),
   
```

Edit stored:

```
{
                "#AnyTestCard": {
                    "resize": {
                        "width": "406.341px",
                        "height": "477.913px"
                    }
                },
                "#__HERAROOT__": {
                    "bgColor": "rgb(86, 25, 121)"
                },
                "#AutomationTitle": {
                    "fontColor": "rgb(54, 41, 41)"
                },
                "#CenterNodeWrapper": {
                    "transform": "translate(112.517px, 40.3906px) matrix3d(0.975702, 0.0050993, 0, 0, -0.0050993, 0.975702, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)"
                },
                "#CenterNodeWrapper > div:nth-child(1)": {
                    "transform": "scale(2.22912, 2.22912)"
                },
                "#GearWrapper > div:nth-child(1) > svg:nth-child(1) > g:nth-child(1) > circle:nth-child(1)": {
                    "bgColor": "rgb(198, 146, 230)"
                },
                "#BugWrapper-bug-3 > div:nth-child(1) > svg:nth-child(1) > g:nth-child(1) > circle:nth-child(1)": {
                    "deleted": true
                },
                "#CenterNodeWrapper > div:nth-child(1) > div:nth-child(2) > svg:nth-child(1) > ellipse:nth-child(2)": {
                    "transform": "scale(1.71316, 1.71316)"
                }
            }


Based on either this approach or a new one. Suggest a best way to design the editing functionaly.             