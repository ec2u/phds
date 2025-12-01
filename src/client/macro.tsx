/*
 * Copyright © 2025 EC2U Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ForgeReconciler, { Box, Button, ButtonGroup, xcss } from "@forge/react";
import React, { useState } from "react";
import { ToolCache } from "./hooks/cache";
import { Rule } from "./views";
import { ToolBar } from "./views/layouts/bar";
import { ToolClear } from "./views/lenses/clear";
import { ToolDashboard } from "./views/lenses/dashboard";
import { ToolIssues } from "./views/lenses/issues";
import { ToolPolicies } from "./views/lenses/policies";


const tabs = {

	"Policies": <ToolPolicies/>,
	"Dashboard": <ToolDashboard/>,
	"Agreement": undefined,
	"Issues": <ToolIssues/>

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ToolMacro() {

    const labels = Object.keys(tabs) as readonly (keyof typeof tabs)[];

    const [active, setActive] = useState(labels[0]);

    const body = tabs[active];


    return <Box xcss={xcss({

        ...(body ? Rule : {})

    })}>

        <ToolBar

            menu={<ButtonGroup>{labels.map((tab) => <>

                <Button key={tab}
                        isSelected={active === tab}
                        onClick={() => setActive(tab)}
                >

                    {tab}

                </Button></>
			)}</ButtonGroup>}


            more={<ButtonGroup>

                <ToolClear/>

            </ButtonGroup>}

        />

        {body}

    </Box>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
    <React.StrictMode>

        <ToolCache>
			<ToolMacro/>
        </ToolCache>

    </React.StrictMode>
);
